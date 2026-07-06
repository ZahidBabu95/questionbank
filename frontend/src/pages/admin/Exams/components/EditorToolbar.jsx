import React from 'react';
import {
    Home as HomeIcon, Plus, LayoutGrid, Settings, Palette, FileText, Save, RotateCcw, RotateCw,
    Bold, Italic, Underline, Strikethrough, Subscript, Superscript, AlignLeft, AlignCenter,
    AlignRight, Outdent, Indent, List, Edit3, BookOpen, Image as ImageIcon, Sigma, Square,
    Scaling, Layout, Scissors, ArrowRightCircle, FileStack, Move
} from 'lucide-react';

const RibbonTab = ({ id, label, icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-5 py-2 text-[12px] font-bold transition-all relative rounded-t-lg mx-0.5 ${
            active ? 'text-indigo-700 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.02)]' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
        }`}
    >
        <Icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} /> {label}
        {active && <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-600 rounded-t-full"></div>}
    </button>
);

const ToolbarGroup = ({ label, children }) => (
    <div className="flex items-center px-3 self-stretch relative group border-r border-slate-200/60 last:border-0 my-1 py-1 flex-col justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 h-full">{children}</div>
        <span className="text-[10px] font-medium text-slate-400 mt-auto">{label}</span>
    </div>
);

const ToolButton = ({ icon: Icon, onClick, onMouseDown, active, label, disabled }) => (
    <button
        onClick={onClick}
        onMouseDown={onMouseDown}
        disabled={disabled}
        title={label}
        className={`p-1.5 rounded transition-all flex items-center justify-center disabled:opacity-30 ${
            active ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-white text-slate-700 active:scale-95'
        }`}
    >
        <Icon size={14} />
    </button>
);

const EditorToolbar = ({
    activeTab,
    handleTabClick,
    navigate,
    saving,
    handleDownload,
    handleUpdate,
    applyCommand,
    config,
    setConfig,
    setExam,
    BLANK_EXAM,
    addQuestion,
    setIsBankOpen,
    fileInputRef,
    handleImageSelect,
    setEquationModalOpen
}) => {
    return (
        <header className="bg-slate-50 border-b border-slate-300 z-50 shrink-0 shadow-sm flex flex-col pt-1">
            {/* Ribbon Tabs Row */}
            <div className="flex items-end px-3 gap-1">
                <div className="w-10 h-10 flex items-center justify-center mb-1 mr-2 bg-indigo-600 rounded-lg text-white shadow-sm cursor-pointer hover:bg-indigo-700 transition-colors" onClick={() => navigate('/exams/generate/saved')}>
                    <FileText size={20} />
                </div>
                <RibbonTab id="home" label="Home" icon={HomeIcon} active={activeTab === 'home'} onClick={() => handleTabClick('home')} />
                <RibbonTab id="insert" label="Insert" icon={Plus} active={activeTab === 'insert'} onClick={() => handleTabClick('insert')} />
                <RibbonTab id="layout" label="Layout" icon={LayoutGrid} active={activeTab === 'layout'} onClick={() => handleTabClick('layout')} />
                <RibbonTab id="metadata" label="Header & Meta" icon={FileText} active={activeTab === 'metadata'} onClick={() => handleTabClick('metadata')} />
                <RibbonTab id="design" label="Design" icon={Palette} active={activeTab === 'design'} onClick={() => handleTabClick('design')} />

                <div className="ml-auto flex items-center gap-3 pr-4 mb-2">
                    <span className="text-xs text-slate-400 font-medium mr-2">{saving ? 'Saving...' : 'All changes saved'}</span>
                    <div className="flex bg-white rounded-md border border-slate-200 p-0.5 shadow-sm">
                        <button onClick={() => handleDownload('docx')} className="p-1.5 hover:bg-slate-50 text-slate-600 rounded transition-all" title="Download Word">
                            <FileText size={14} />
                        </button>
                        <button onClick={() => handleDownload('pdf')} className="p-1.5 hover:bg-slate-50 text-indigo-600 rounded transition-all font-bold text-[10px]" title="Export PDF">
                            PDF
                        </button>
                    </div>
                    <button onClick={handleUpdate} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-all shadow-md disabled:opacity-50 active:scale-95">
                        <Save size={14} /> Save Changes
                    </button>
                </div>
            </div>

            {/* Sub-Toolbar (Active Tab Controls) */}
            <div className="bg-white flex flex-wrap items-stretch shadow-md px-2 py-1.5 gap-y-1 w-full relative z-10 border-b border-slate-200">

                {activeTab === 'home' && (
                    <>
                        <ToolbarGroup label="Undo/Redo">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md divide-x divide-slate-200 overflow-hidden shadow-sm">
                                <button title="Undo" onMouseDown={(e) => applyCommand(e, 'undo')} className="p-2 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center"><RotateCcw size={14} /></button>
                                <button title="Redo" onMouseDown={(e) => applyCommand(e, 'redo')} className="p-2 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center"><RotateCw size={14} /></button>
                            </div>
                        </ToolbarGroup>
                        <ToolbarGroup label="Font">
                            <div className="flex flex-col gap-1.5 justify-center h-full">
                                {/* Row 1 */}
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={config.fontFamily}
                                        onChange={e => setConfig({ ...config, fontFamily: e.target.value })}
                                        className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2 py-1 text-[11px] font-semibold outline-none focus:border-indigo-500 w-32 shadow-sm cursor-pointer"
                                    >
                                        <option value="font-serif">Classic Serif</option>
                                        <option value="font-sans">Modern Sans</option>
                                        <option value="font-hind text-lg">Hind (Unicode)</option>
                                        <option value="font-noto text-lg">Noto (Unicode)</option>
                                        <option value="font-tiro text-lg">Tiro (Unicode)</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={config.fontSize}
                                        onChange={e => setConfig({ ...config, fontSize: parseInt(e.target.value) })}
                                        className="w-12 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[11px] font-semibold outline-none px-1.5 py-1 text-center shadow-sm"
                                    />
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md divide-x divide-slate-200 overflow-hidden shadow-sm">
                                        <button title="Highlight Yellow" onMouseDown={(e) => applyCommand(e, 'hiliteColor', '#fef08a')} className="p-1 hover:bg-slate-150 flex items-center justify-center"><div className="w-3.5 h-3.5 bg-yellow-400 rounded-sm"></div></button>
                                        <button title="Text Color Red" onMouseDown={(e) => applyCommand(e, 'foreColor', '#ef4444')} className="p-1 px-2 hover:bg-slate-150 flex items-center justify-center font-black text-[10px] text-red-600 leading-none pb-[2px] relative">A<div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-[1.5px] bg-red-600 rounded"></div></button>
                                    </div>
                                </div>
                                {/* Row 2 */}
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md divide-x divide-slate-200 overflow-hidden shadow-sm">
                                        <button title="Bold" onMouseDown={(e) => applyCommand(e, 'bold')} className="p-1 px-2.5 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center font-bold text-[11px]">B</button>
                                        <button title="Italic" onMouseDown={(e) => applyCommand(e, 'italic')} className="p-1 px-2.5 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center italic text-[11px]">I</button>
                                        <button title="Underline" onMouseDown={(e) => applyCommand(e, 'underline')} className="p-1 px-2.5 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center underline text-[11px]">U</button>
                                        <button title="Strikethrough" onMouseDown={(e) => applyCommand(e, 'strikethrough')} className="p-1 px-2.5 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center line-through text-[11px]">S</button>
                                    </div>
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md divide-x divide-slate-200 overflow-hidden shadow-sm">
                                        <button title="Subscript" onMouseDown={(e) => applyCommand(e, 'subscript')} className="p-1 px-2 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center text-[10px]">x<sub>2</sub></button>
                                        <button title="Superscript" onMouseDown={(e) => applyCommand(e, 'superscript')} className="p-1 px-2 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center text-[10px]">x<sup>2</sup></button>
                                    </div>
                                </div>
                            </div>
                        </ToolbarGroup>
                        <ToolbarGroup label="Paragraph">
                            <div className="flex flex-col gap-1.5 justify-center h-full">
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md divide-x divide-slate-200 overflow-hidden shadow-sm">
                                    <button title="Left Align" onMouseDown={(e) => applyCommand(e, 'justifyLeft')} className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center"><AlignLeft size={12} /></button>
                                    <button title="Center Align" onMouseDown={(e) => applyCommand(e, 'justifyCenter')} className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center"><AlignCenter size={12} /></button>
                                    <button title="Right Align" onMouseDown={(e) => applyCommand(e, 'justifyRight')} className="p-1.5 px-2.5 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center"><AlignRight size={12} /></button>
                                </div>
                                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md divide-x divide-slate-200 overflow-hidden shadow-sm">
                                    <button title="Decrease Indent" onMouseDown={(e) => applyCommand(e, 'outdent')} className="p-1.5 px-3 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center"><Outdent size={12} /></button>
                                    <button title="Increase Indent" onMouseDown={(e) => applyCommand(e, 'indent')} className="p-1.5 px-3 hover:bg-slate-100 text-slate-700 active:scale-95 flex items-center justify-center"><Indent size={12} /></button>
                                </div>
                            </div>
                        </ToolbarGroup>
                        <ToolbarGroup label="Spacing">
                            <div className="flex flex-col gap-1 justify-center h-full">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-500 w-14 text-right">Line Gap</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={config.lineSpacing}
                                        onChange={e => setConfig({ ...config, lineSpacing: parseFloat(e.target.value) })}
                                        className="w-12 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[10px] font-semibold outline-none px-1 py-0.5 text-center shadow-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-500 w-14 text-right">Char Gap</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={config.letterSpacing}
                                        onChange={e => setConfig({ ...config, letterSpacing: parseFloat(e.target.value) })}
                                        className="w-12 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[10px] font-semibold outline-none px-1 py-0.5 text-center shadow-sm"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-slate-500 w-14 text-right">Q Gap</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={config.questionGap}
                                        onChange={e => setConfig({ ...config, questionGap: parseFloat(e.target.value) })}
                                        className="w-12 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[10px] font-semibold outline-none px-1 py-0.5 text-center shadow-sm"
                                    />
                                </div>
                            </div>
                        </ToolbarGroup>
                        <ToolbarGroup label="Reset">
                            <button onClick={() => setExam(BLANK_EXAM)} className="flex flex-col items-center justify-center gap-1 px-4 h-full hover:bg-rose-50 rounded-lg transition-colors group">
                                <RotateCcw size={18} className="text-rose-500 group-hover:rotate-[-45deg] transition-all" />
                                <span className="text-[10px] font-bold text-rose-500">Clear All</span>
                            </button>
                        </ToolbarGroup>
                    </>
                )}

                {activeTab === 'insert' && (
                    <>
                        <ToolbarGroup label="Questions">
                            <button onClick={() => addQuestion('MCQ')} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                <List size={22} className="text-indigo-600" />
                                <span className="text-[11px] font-medium text-slate-700">MCQ</span>
                            </button>
                            <button onClick={() => addQuestion('CQ')} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                <Edit3 size={22} className="text-emerald-600" />
                                <span className="text-[11px] font-medium text-slate-700">Written</span>
                            </button>
                            <button id="toolbar-bank-btn" onClick={() => setIsBankOpen(true)} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                <BookOpen size={22} className="text-amber-500" />
                                <span className="text-[11px] font-medium text-slate-700">Bank</span>
                            </button>
                        </ToolbarGroup>
                        <ToolbarGroup label="Media">
                            <button onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                <ImageIcon size={22} className="text-slate-600" />
                                <span className="text-[11px] font-medium text-slate-700">Image</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

                            <button id="toolbar-equation-btn" onMouseDown={(e) => { e.preventDefault(); setEquationModalOpen(true); }} className="flex flex-col items-center gap-1 px-4 hover:bg-slate-50 rounded py-1 transition-colors">
                                <Sigma size={22} className="text-blue-600" />
                                <span className="text-[11px] font-medium text-slate-700">Math</span>
                            </button>
                        </ToolbarGroup>
                    </>
                )}

                {activeTab === 'layout' && (
                    <>
                        <ToolbarGroup label="Page Setup">
                            <div className="flex flex-col gap-1.5 justify-center h-full">
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-center">
                                        <button 
                                            onClick={() => setConfig({...config, orientation: 'portrait'})}
                                            className={`p-1 rounded ${config.orientation === 'portrait' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                                            title="Portrait Orientation"
                                        >
                                            <Square size={20} className="rotate-0" />
                                        </button>
                                        <span className="text-[9px] font-bold text-slate-500">Portrait</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <button 
                                            onClick={() => setConfig({...config, orientation: 'landscape'})}
                                            className={`p-1 rounded ${config.orientation === 'landscape' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100'}`}
                                            title="Landscape Orientation"
                                        >
                                            <Square size={20} className="rotate-90" />
                                        </button>
                                        <span className="text-[9px] font-bold text-slate-500">Landscape</span>
                                    </div>
                                    <div className="w-[1px] h-8 bg-slate-200 mx-1"></div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Scaling size={14} className="text-slate-400" />
                                            <select
                                                value={config.paperSize}
                                                onChange={e => setConfig({ ...config, paperSize: e.target.value })}
                                                className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold outline-none focus:border-indigo-500 w-24"
                                            >
                                                <option value="A4">A4 (21 x 29.7cm)</option>
                                                <option value="Legal">Legal (21.6 x 35.6cm)</option>
                                                <option value="Letter">Letter (21.6 x 27.9cm)</option>
                                                <option value="A3">A3 (29.7 x 42cm)</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Layout size={14} className="text-slate-400" />
                                            <select
                                                value={config.margins}
                                                onChange={e => setConfig({ ...config, margins: e.target.value })}
                                                className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold outline-none focus:border-indigo-500 w-24"
                                            >
                                                <option value="narrow">Narrow (0.5")</option>
                                                <option value="moderate">Moderate (0.75")</option>
                                                <option value="normal">Normal (1.0")</option>
                                                <option value="wide">Wide (1.5")</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ToolbarGroup>
                        
                        <ToolbarGroup label="Columns">
                            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded p-1">
                                <button 
                                    onClick={() => setConfig({...config, columns: 1})}
                                    className={`px-3 py-1 rounded text-[11px] font-bold flex flex-col items-center gap-1 ${config.columns === 1 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                                >
                                    <div className="w-4 h-5 border border-current opacity-40"></div>
                                    One
                                </button>
                                <button 
                                    onClick={() => setConfig({...config, columns: 2})}
                                    className={`px-3 py-1 rounded text-[11px] font-bold flex flex-col items-center gap-1 ${config.columns === 2 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                                >
                                    <div className="w-4 h-5 border-x border-current opacity-40 flex"><div className="w-1/2 border-r border-current"></div></div>
                                    Two
                                </button>
                                <button 
                                    onClick={() => setConfig({...config, columns: 3})}
                                    className={`px-3 py-1 rounded text-[11px] font-bold flex flex-col items-center gap-1 ${config.columns === 3 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-white'}`}
                                >
                                    <div className="w-4 h-5 border-x border-current opacity-40 flex"><div className="w-1/3 border-r border-current"></div><div className="w-1/3 border-r border-current"></div></div>
                                    Three
                                </button>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Breaks & Flow">
                            <div className="flex flex-col gap-1.5 justify-center h-full">
                                <button className="flex items-center gap-2 px-3 py-1 hover:bg-slate-100 rounded text-[11px] font-bold text-slate-700 transition-colors">
                                    <Scissors size={14} className="text-rose-500" />
                                    <span>Page Break</span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <ArrowRightCircle size={14} className="text-indigo-500" />
                                    <select
                                        value={config.columnLayout}
                                        onChange={e => setConfig({ ...config, columnLayout: e.target.value })}
                                        className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-bold outline-none focus:border-indigo-500"
                                    >
                                        <option value="vertical">Column Flow</option>
                                        <option value="horizontal">Zigzag Flow</option>
                                    </select>
                                </div>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="View Mode">
                            <div className="flex flex-col gap-1.5 justify-center h-full">
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded p-[2px]">
                                    <button 
                                        onClick={() => setConfig({...config, pageView: 'paginated'})}
                                        className={`p-1.5 rounded transition-all flex flex-col items-center ${config.pageView === 'paginated' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        title="Page Layout"
                                    >
                                        <FileStack size={16} />
                                    </button>
                                    <button 
                                        onClick={() => setConfig({...config, pageView: 'continuous'})}
                                        className={`p-1.5 rounded transition-all flex flex-col items-center ${config.pageView === 'continuous' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        title="Continuous Scroll"
                                    >
                                        <Move size={16} />
                                    </button>
                                </div>
                                <span className="text-[9px] font-bold text-slate-500 text-center uppercase">{config.pageView}</span>
                            </div>
                        </ToolbarGroup>
                    </>
                )}

                {activeTab === 'metadata' && (
                    <div className="flex items-center px-4 py-2.5 text-xs font-bold text-slate-500 gap-2">
                        <FileText size={14} className="text-indigo-600 animate-pulse" />
                        <span>ডান প্রপার্টিজ প্যানেলে পরীক্ষার হেডার ও মেটাডেটা এডিট করুন।</span>
                    </div>
                )}

                {activeTab === 'design' && (
                    <>
                        <ToolbarGroup label="Watermark">
                            <div className="flex items-center gap-2 px-2">
                                <input type="checkbox" checked={config.watermark} onChange={e => setConfig({ ...config, watermark: e.target.checked })} id="wm-toggle" />
                                <label htmlFor="wm-toggle" className="text-xs text-slate-700 font-medium">Enable Watermark</label>
                            </div>
                            {config.watermark && (
                                <input
                                    type="text"
                                    value={config.watermarkText}
                                    onChange={e => setConfig({ ...config, watermarkText: e.target.value })}
                                    className="bg-white border border-slate-300 rounded px-2 py-1 text-xs outline-none w-32 mt-1"
                                    placeholder="Text"
                                />
                            )}
                        </ToolbarGroup>
                    </>
                )}
            </div>
        </header>
    );
};

export default EditorToolbar;
