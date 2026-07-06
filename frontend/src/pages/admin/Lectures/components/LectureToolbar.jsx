import React from 'react';
import {
    Home as HomeIcon, Plus, LayoutGrid, Settings, Palette, FileText, Save, RotateCcw, RotateCw,
    Bold, Italic, Underline, Strikethrough, Subscript, Superscript, AlignLeft, AlignCenter,
    AlignRight, AlignJustify, Outdent, Indent, List, Edit3, BookOpen, Image as ImageIcon, Sigma, Square,
    Scaling, Layout, Scissors, ArrowRightCircle, FileStack, Move, Sparkles, Paperclip, Upload, ArrowLeft, Play,
    HelpCircle, ExternalLink, Printer
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

const ToolbarGroup = ({ label, children, onLauncherClick }) => (
    <div className="flex items-center px-3 self-stretch relative group border-r border-slate-200/60 last:border-0 my-1 py-1 flex-col justify-between gap-1.5 shrink-0">
        <div className="flex items-center gap-1.5 h-full">{children}</div>
        <div className="w-full flex items-center justify-center relative mt-auto">
            <span className="text-[10px] font-medium text-slate-400">{label}</span>
            {onLauncherClick && (
                <button
                    onClick={onLauncherClick}
                    className="absolute right-0 bottom-0 p-0.5 rounded hover:bg-slate-150 text-slate-400 hover:text-indigo-600 transition-colors"
                    title={`${label} settings`}
                >
                    <ExternalLink size={10} />
                </button>
            )}
        </div>
    </div>
);

const ToolButton = ({ icon: Icon, onClick, onMouseDown, active, label, disabled }) => (
    <button
        onClick={onClick}
        onMouseDown={onMouseDown}
        disabled={disabled}
        title={label}
        className={`p-1.5 rounded transition-all flex items-center justify-center disabled:opacity-30 ${
            active ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-50 text-slate-700 active:scale-95'
        }`}
    >
        <Icon size={14} />
    </button>
);

const LectureToolbar = ({
    title,
    setTitle,
    activeTab,
    handleTabClick,
    saving,
    handleSaveDraft,
    generatingExam,
    handleCreateExam,
    pdfLoading,
    handleDownloadPDF,
    handleStartPresentation,
    showAttachments,
    setShowAttachments,
    navigate,
    addSection,
    activeSectionId,
    handleAIAssist,
    aiGenerating,
    applyCommand,
    handleFontFamilyChange,
    handleFontSizeChange,
    config,
    setConfig,
    addQuestion,
    fileInputRef,
    handleImageSelect,
    setEquationModalOpen,
    showInstructions,
    setShowInstructions,
    setRightPanelOpen,
    setHighlightedSection,
    editorStyles = {},
    getFontFamilyClass = () => '',
    editor = null
}) => {
    const [showColorPicker, setShowColorPicker] = React.useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = React.useState(false);

    const handleLauncherClick = (tabId, sectionId) => {
        handleTabClick(tabId);
        setRightPanelOpen(true);
        setHighlightedSection(sectionId);
        setTimeout(() => {
            setHighlightedSection(null);
        }, 2000);
    };

    const handleInstructionsClick = () => {
        handleTabClick('home');
        setRightPanelOpen(true);
        setShowInstructions(true);
        setHighlightedSection('instructions');
        setTimeout(() => {
            setHighlightedSection(null);
        }, 2000);
    };

    return (
        <header className="bg-slate-50 border-b border-slate-300 z-30 shrink-0 shadow-sm flex flex-col pt-1 select-none font-outfit">
            {/* Top Config Row */}
            <div className="px-6 py-2 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/knowledge-hub/ai-reader')}
                        className="p-2 hover:bg-slate-200 rounded-xl transition text-slate-500 hover:text-slate-800"
                        title="Back to Bookshelf"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="text-md font-black text-slate-800 bg-transparent border-none outline-none focus:ring-0 p-0 hover:bg-slate-200/50 rounded px-2 min-w-[300px]"
                            placeholder="Lecture Sheet Title..."
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCreateExam}
                        disabled={generatingExam}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-100 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Sparkles size={14} className="animate-pulse" />
                        {generatingExam ? 'পরীক্ষা তৈরি হচ্ছে...' : 'এক-ক্লিকে প্রশ্নপত্র তৈরি'}
                    </button>
                    
                    <button 
                        onClick={handleStartPresentation}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition active:scale-95"
                        title="স্লাইড শো প্রেজেন্টেশন চালু করুন"
                    >
                        <Play size={14} className="text-indigo-600" />
                        <span>Presentation</span>
                    </button>

                    <button 
                        onClick={() => handleDownloadPDF(false)} 
                        disabled={pdfLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition active:scale-95 disabled:opacity-50"
                    >
                        <FileText size={14} className={pdfLoading ? "animate-pulse text-rose-500" : "text-rose-600"} />
                        <span>{pdfLoading ? 'PDF তৈরি হচ্ছে...' : 'Download PDF'}</span>
                    </button>

                    <button 
                        onClick={() => handleDownloadPDF(true)} 
                        disabled={pdfLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 transition active:scale-95 disabled:opacity-50"
                        title="শুধুমাত্র কভার পেজটি পিডিএফ হিসেবে ডাউনলোড করুন"
                    >
                        <Printer size={14} className={pdfLoading ? "animate-pulse text-amber-500" : "text-amber-600"} />
                        <span>{pdfLoading ? 'কভার তৈরি হচ্ছে...' : 'Cover PDF Only'}</span>
                    </button>

                    <button 
                        onClick={() => window.print()} 
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition active:scale-95"
                        title="প্রিন্ট করুন"
                    >
                        <Printer size={14} className="text-emerald-600" />
                        <span>Print</span>
                    </button>

                    <button 
                        onClick={() => setShowAttachments(!showAttachments)}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-xs rounded-xl transition ${showAttachments ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                        <Paperclip size={14} />
                        <span>Attachments</span>
                    </button>

                    <button 
                        onClick={handleSaveDraft} 
                        disabled={saving} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition disabled:opacity-50"
                    >
                        <Save size={14} /> 
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>

                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-100 transition active:scale-95">
                        <Upload size={14} /> 
                        <span>Publish</span>
                    </button>
                </div>
            </div>

            {/* Ribbon Tabs Row */}
            <div className="flex items-end px-3 gap-1">
                <div className="w-9 h-9 flex items-center justify-center mb-1 mr-2 bg-indigo-600 rounded-lg text-white shadow-sm cursor-pointer hover:bg-indigo-700 transition-colors" onClick={() => navigate('/knowledge-hub/ai-reader')} title="Back to Library">
                    <BookOpen size={18} />
                </div>
                <RibbonTab id="home" label="Home" icon={HomeIcon} active={activeTab === 'home'} onClick={() => handleTabClick('home')} />
                <RibbonTab id="insert" label="Insert" icon={Plus} active={activeTab === 'insert'} onClick={() => handleTabClick('insert')} />
                <RibbonTab id="layout" label="Layout" icon={LayoutGrid} active={activeTab === 'layout'} onClick={() => handleTabClick('layout')} />
                <RibbonTab id="metadata" label="Header & Meta" icon={FileText} active={activeTab === 'metadata'} onClick={() => handleTabClick('metadata')} />
                <RibbonTab id="design" label="Design" icon={Palette} active={activeTab === 'design'} onClick={() => handleTabClick('design')} />
                <RibbonTab id="settings" label="Settings" icon={Settings} active={activeTab === 'settings'} onClick={() => handleTabClick('settings')} />
            </div>

            {/* Sub-Toolbar (Active Tab Controls) */}
            <div className="bg-white flex flex-wrap items-stretch shadow-sm px-2 py-1 gap-y-1 w-full relative z-10 border-t border-b border-slate-200">
                {activeTab === 'home' && (
                    <>
                        <ToolbarGroup label="Undo/Redo">
                            <ToolButton icon={RotateCcw} label="Undo" onMouseDown={(e) => applyCommand(e, 'undo')} />
                            <ToolButton icon={RotateCw} label="Redo" onMouseDown={(e) => applyCommand(e, 'redo')} />
                        </ToolbarGroup>

                        <ToolbarGroup label="Font" onLauncherClick={() => handleLauncherClick('home', 'font')}>
                            <div className="flex flex-col gap-1 justify-center h-full">
                                {/* Row 1 */}
                                <div className="flex items-center gap-1">
                                    <select
                                        value={getFontFamilyClass(editorStyles.fontFamily) || config.fontFamily}
                                        onChange={e => handleFontFamilyChange(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2 py-0.5 text-[10px] font-semibold outline-none focus:border-indigo-500 w-28"
                                    >
                                        <option value="font-serif">Classic Serif</option>
                                        <option value="font-sans">Modern Sans</option>
                                        <option value="font-hind text-lg">Hind Siliguri</option>
                                        <option value="font-noto text-lg">Noto Sans Bengali</option>
                                        <option value="font-tiro text-lg">Tiro Bangla</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={editorStyles.fontSize || config.fontSize}
                                        onChange={e => handleFontSizeChange(parseInt(e.target.value) || 12)}
                                        className="w-10 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-[10px] font-semibold outline-none px-1 py-0.5 text-center"
                                    />
                                    <div className="w-[1px] h-3 bg-slate-200 mx-1"></div>
                                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded p-[1px]">
                                        {/* Text Color Picker */}
                                        <div className="relative flex items-center justify-center">
                                            <button 
                                                title="Text Color" 
                                                disabled={editorStyles.isSelectionEmpty}
                                                onClick={() => { if (!editorStyles.isSelectionEmpty) { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); } }}
                                                className="p-1 px-1.5 rounded hover:bg-white flex items-center justify-center font-bold text-[8px] leading-none transition active:scale-95 border-b-2 disabled:opacity-30 disabled:cursor-not-allowed"
                                                style={{ borderBottomColor: editorStyles.textColor || '#1e293b', color: editorStyles.textColor || '#1e293b' }}
                                            >
                                                A
                                            </button>
                                            {showColorPicker && (
                                                <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-2 grid grid-cols-4 gap-1.5 z-[100] w-32 animate-in fade-in duration-100">
                                                    {[
                                                        { name: 'Default', code: '#1e293b' },
                                                        { name: 'Red', code: '#ef4444' },
                                                        { name: 'Blue', code: '#3b82f6' },
                                                        { name: 'Green', code: '#22c55e' },
                                                        { name: 'Orange', code: '#f97316' },
                                                        { name: 'Purple', code: '#a855f7' },
                                                        { name: 'Gold', code: '#eab308' },
                                                        { name: 'Indigo', code: '#4f46e5' }
                                                    ].map(c => (
                                                        <button
                                                            key={c.code}
                                                            title={c.name}
                                                            onMouseDown={(e) => { e.preventDefault(); applyCommand(e, 'foreColor', c.code); setShowColorPicker(false); }}
                                                            className="w-5 h-5 rounded-full border border-slate-250 shadow-sm hover:scale-115 active:scale-95 transition-all"
                                                            style={{ backgroundColor: c.code }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Highlight Picker */}
                                        <div className="relative flex items-center justify-center">
                                            <button 
                                                title="Highlight Color" 
                                                disabled={editorStyles.isSelectionEmpty}
                                                onClick={() => { if (!editorStyles.isSelectionEmpty) { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); } }}
                                                className="p-1 rounded hover:bg-white flex items-center justify-center transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <div 
                                                    className="w-3.5 h-3.5 rounded-sm border border-slate-300"
                                                    style={{ backgroundColor: editorStyles.highlightColor || 'transparent' }}
                                                />
                                            </button>
                                            {showHighlightPicker && (
                                                <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-2 grid grid-cols-4 gap-1.5 z-[100] w-32 animate-in fade-in duration-100">
                                                    {[
                                                        { name: 'None', code: 'transparent' },
                                                        { name: 'Yellow', code: '#fef08a' },
                                                        { name: 'Green', code: '#bbf7d0' },
                                                        { name: 'Blue', code: '#bfdbfe' },
                                                        { name: 'Pink', code: '#fbcfe8' },
                                                        { name: 'Purple', code: '#e9d5ff' },
                                                        { name: 'Orange', code: '#fed7aa' },
                                                        { name: 'Lime', code: '#d9f99d' }
                                                    ].map(c => (
                                                        <button
                                                            key={c.code}
                                                            title={c.name}
                                                            onMouseDown={(e) => { 
                                                                e.preventDefault(); 
                                                                if (c.code === 'transparent') {
                                                                    if (editor) editor.chain().focus().unsetHighlightColor().run();
                                                                } else {
                                                                    applyCommand(e, 'hiliteColor', c.code); 
                                                                }
                                                                setShowHighlightPicker(false); 
                                                            }}
                                                            className="w-5 h-5 rounded-full border border-slate-250 shadow-sm hover:scale-115 active:scale-95 transition-all flex items-center justify-center"
                                                            style={{ backgroundColor: c.code }}
                                                        >
                                                            {c.code === 'transparent' && <span className="text-[8px] text-slate-405 font-bold">❌</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Row 2 */}
                                <div className="flex items-center gap-1">
                                    <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[1px]">
                                        <ToolButton icon={Bold} label="Bold" active={editorStyles.bold} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'bold')} />
                                        <ToolButton icon={Italic} label="Italic" active={editorStyles.italic} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'italic')} />
                                        <ToolButton icon={Underline} label="Underline" active={editorStyles.underline} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'underline')} />
                                        <ToolButton icon={Strikethrough} label="Strikethrough" active={editorStyles.strikethrough} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'strikethrough')} />
                                    </div>
                                    <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[1px]">
                                        <ToolButton icon={Subscript} label="Subscript" disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'subscript')} />
                                        <ToolButton icon={Superscript} label="Superscript" disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'superscript')} />
                                    </div>
                                </div>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Paragraph" onLauncherClick={() => handleLauncherClick('home', 'paragraph')}>
                            <div className="flex flex-col gap-1 justify-center h-full">
                                <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[1px]">
                                    <ToolButton icon={AlignLeft} label="Left Align" active={editorStyles.textAlign === 'left'} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'justifyLeft')} />
                                    <ToolButton icon={AlignCenter} label="Center Align" active={editorStyles.textAlign === 'center'} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'justifyCenter')} />
                                    <ToolButton icon={AlignRight} label="Right Align" active={editorStyles.textAlign === 'right'} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'justifyRight')} />
                                    <ToolButton icon={AlignJustify} label="Justify Align" active={editorStyles.textAlign === 'justify'} disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'justifyFull')} />
                                </div>
                                <div className="flex gap-0.5 bg-slate-50 border border-slate-200 rounded p-[1px]">
                                    <ToolButton icon={Outdent} label="Decrease Indent" disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'outdent')} />
                                    <ToolButton icon={Indent} label="Increase Indent" disabled={editorStyles.isSelectionEmpty} onMouseDown={(e) => applyCommand(e, 'indent')} />
                                </div>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Columns">
                            <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded p-[1px]">
                                <button
                                    onClick={() => setConfig({ ...config, columns: 1 })}
                                    className={`px-2 py-1 rounded text-[9px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                                        (config.columns || 1) === 1
                                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-250'
                                            : 'hover:bg-slate-100 text-slate-500 border border-transparent'
                                    }`}
                                    title="1 Column"
                                >
                                    <div className="w-4 h-4 border border-current rounded-sm flex items-center justify-center p-[1px]">
                                        <div className="w-full h-full bg-current opacity-40"></div>
                                    </div>
                                    <span>1 Column</span>
                                </button>
                                <button
                                    onClick={() => setConfig({ ...config, columns: 2 })}
                                    className={`px-2 py-1 rounded text-[9px] font-bold transition-all flex flex-col items-center gap-0.5 ${
                                        config.columns === 2
                                            ? 'bg-white text-indigo-700 shadow-sm border border-slate-250'
                                            : 'hover:bg-slate-100 text-slate-500 border border-transparent'
                                    }`}
                                    title="2 Columns"
                                >
                                    <div className="w-4 h-4 border border-current rounded-sm flex gap-[2px] p-[1px]">
                                        <div className="w-1/2 h-full bg-current opacity-40"></div>
                                        <div className="w-1/2 h-full bg-current opacity-40"></div>
                                    </div>
                                    <span>2 Columns</span>
                                </button>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Spacing" onLauncherClick={() => handleLauncherClick('home', 'spacing')}>
                            <div className="flex flex-col gap-1 justify-center h-full text-[9px] font-semibold text-slate-500">
                                <div className="flex items-center gap-1">
                                    <span className="w-10">Line Gap</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={config.lineSpacing}
                                        onChange={e => setConfig({ ...config, lineSpacing: parseFloat(e.target.value) })}
                                        className="w-10 bg-slate-50 border border-slate-200 rounded px-1 text-[10px] text-center"
                                    />
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="w-10">Char Gap</span>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={config.letterSpacing}
                                        onChange={e => setConfig({ ...config, letterSpacing: parseFloat(e.target.value) })}
                                        className="w-10 bg-slate-50 border border-slate-200 rounded px-1 text-[10px] text-center"
                                    />
                                </div>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Guide">
                            <button
                                onClick={handleInstructionsClick}
                                className={`flex flex-col items-center gap-0.5 px-3 rounded py-0.5 transition-colors border border-transparent ${
                                    showInstructions ? 'bg-amber-50 text-amber-700 border-amber-250' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                                title="Show Instructions"
                            >
                                <HelpCircle size={18} className="text-amber-500 hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black">Instructions</span>
                            </button>
                        </ToolbarGroup>
                    </>
                )}

                {activeTab === 'insert' && (
                    <>
                        <ToolbarGroup label="Lecture Sections & Questions" onLauncherClick={() => handleLauncherClick('insert', 'content')}>
                            <button onClick={addSection} className="flex flex-col items-center gap-0.5 px-3 hover:bg-slate-50 rounded py-0.5 transition-colors">
                                <Edit3 size={18} className="text-indigo-600" />
                                <span className="text-[10px] font-medium text-slate-700">New Section</span>
                            </button>
                            <button onClick={() => addQuestion('MCQ')} className="flex flex-col items-center gap-0.5 px-3 hover:bg-slate-50 rounded py-0.5 transition-colors">
                                <List size={18} className="text-purple-600" />
                                <span className="text-[10px] font-medium text-slate-700">Add MCQ</span>
                            </button>
                            <button onClick={() => addQuestion('CQ')} className="flex flex-col items-center gap-0.5 px-3 hover:bg-slate-50 rounded py-0.5 transition-colors">
                                <FileText size={18} className="text-emerald-600" />
                                <span className="text-[10px] font-medium text-slate-700">Add Written</span>
                            </button>
                        </ToolbarGroup>

                        <ToolbarGroup label="Media" onLauncherClick={() => handleLauncherClick('insert', 'media')}>
                            <button onMouseDown={(e) => { e.preventDefault(); fileInputRef.current?.click(); }} className="flex flex-col items-center gap-0.5 px-3 hover:bg-slate-50 rounded py-0.5 transition-colors">
                                <ImageIcon size={18} className="text-slate-600" />
                                <span className="text-[10px] font-medium text-slate-700">Image</span>
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

                            <button id="toolbar-equation-btn" onMouseDown={(e) => { e.preventDefault(); setEquationModalOpen(true); }} className="flex flex-col items-center gap-0.5 px-3 hover:bg-slate-50 rounded py-0.5 transition-colors">
                                <Sigma size={18} className="text-blue-600" />
                                <span className="text-[10px] font-medium text-slate-700">Math Equation</span>
                            </button>
                        </ToolbarGroup>

                        <ToolbarGroup label="AI Writing Assistant">
                            <button 
                                onClick={() => handleAIAssist()}
                                disabled={aiGenerating || !activeSectionId}
                                className="flex flex-col items-center justify-center gap-0.5 px-4 hover:bg-indigo-50 rounded py-0.5 transition-colors disabled:opacity-40"
                            >
                                <Sparkles size={18} className={`text-indigo-600 ${aiGenerating ? 'animate-spin' : ''}`} />
                                <span className="text-[10px] font-black text-indigo-700">AI Write Assist</span>
                            </button>
                        </ToolbarGroup>
                    </>
                )}

                {activeTab === 'layout' && (
                    <>
                        <ToolbarGroup label="Page Setup" onLauncherClick={() => handleLauncherClick('layout', 'paper')}>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setConfig({...config, orientation: 'portrait'})}
                                    className={`p-1.5 rounded flex flex-col items-center gap-0.5 ${config.orientation === 'portrait' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    <Square size={16} />
                                    <span className="text-[8px] font-bold">Portrait</span>
                                </button>
                                <button 
                                    onClick={() => setConfig({...config, orientation: 'landscape'})}
                                    className={`p-1.5 rounded flex flex-col items-center gap-0.5 ${config.orientation === 'landscape' ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    <Square size={16} className="rotate-90" />
                                    <span className="text-[8px] font-bold">Landscape</span>
                                </button>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Paper Setup" onLauncherClick={() => handleLauncherClick('layout', 'paper')}>
                            <div className="flex flex-col gap-1 justify-center h-full text-[9px] font-semibold text-slate-500">
                                <div className="flex items-center gap-2">
                                    <Scaling size={12} className="text-slate-400" />
                                    <select
                                        value={config.paperSize}
                                        onChange={e => setConfig({ ...config, paperSize: e.target.value })}
                                        className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold w-24 outline-none cursor-pointer"
                                    >
                                        <option value="A4">A4 Size</option>
                                        <option value="Legal">Legal Size</option>
                                        <option value="Letter">Letter Size</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Layout size={12} className="text-slate-400" />
                                    <select
                                        value={config.margins}
                                        onChange={e => setConfig({ ...config, margins: e.target.value })}
                                        className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold w-24 outline-none cursor-pointer"
                                    >
                                        <option value="narrow">Narrow (0.5")</option>
                                        <option value="moderate">Moderate (0.75")</option>
                                        <option value="normal">Normal (1.0")</option>
                                        <option value="wide">Wide (1.5")</option>
                                    </select>
                                </div>
                            </div>
                        </ToolbarGroup>
                    </>
                )}

                {activeTab === 'metadata' && (
                    <div className="flex items-center px-4 py-2 text-xs font-bold text-slate-500 gap-2">
                        <FileText size={14} className="text-indigo-600 animate-pulse" />
                        <span>ডান প্রপার্টিজ প্যানেলে লেকচার শিটের হেডার ও মেটাডেটা এডিট করুন।</span>
                    </div>
                )}

                {activeTab === 'design' && (
                    <>
                        <ToolbarGroup label="Cover Page Template" onLauncherClick={() => handleLauncherClick('design', 'cover')}>
                            <select
                                value={config.coverTemplate || 'classic'}
                                onChange={e => {
                                    const val = e.target.value;
                                    let presets = { coverTemplate: val };
                                    if (val === 'classic') {
                                        presets = { ...presets, coverAccentColor: '#4f46e5', paperColor: '#ffffff', showPageBorder: true, instituteFontSize: 22, titleFontSize: 16 };
                                    } else if (val === 'minimal') {
                                        presets = { ...presets, coverAccentColor: '#4f46e5', paperColor: '#fafaf9', showPageBorder: false, instituteFontSize: 18, titleFontSize: 20 };
                                    } else if (val === 'modern') {
                                        presets = { ...presets, coverAccentColor: '#0f172a', paperColor: '#ffffff', showPageBorder: true, instituteFontSize: 20, titleFontSize: 18 };
                                    } else if (val === 'premium') {
                                        presets = { ...presets, coverAccentColor: '#b45309', paperColor: '#fefcbf', showPageBorder: true, instituteFontSize: 24, titleFontSize: 22 };
                                    }
                                    setConfig({ ...config, ...presets });
                                }}
                                className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded px-2 py-0.5 text-[10px] font-semibold outline-none focus:border-indigo-500 w-28 cursor-pointer"
                            >
                                <option value="classic">Classic Academic</option>
                                <option value="minimal">Minimalist Modern</option>
                                <option value="modern">Modern Creative</option>
                                <option value="premium">Premium Elegant</option>
                            </select>
                        </ToolbarGroup>

                        <ToolbarGroup label="Accent Color">
                            <div className="flex gap-1.5 items-center">
                                {[
                                    { code: '#4f46e5', name: 'Indigo' },
                                    { code: '#0f172a', name: 'Slate' },
                                    { code: '#059669', name: 'Green' },
                                    { code: '#dc2626', name: 'Red' },
                                    { code: '#b45309', name: 'Amber' },
                                    { code: '#7c3aed', name: 'Purple' }
                                ].map(color => (
                                    <button
                                        key={color.code}
                                        onClick={() => setConfig({ ...config, coverAccentColor: color.code })}
                                        className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-all flex items-center justify-center ${
                                            config.coverAccentColor === color.code ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105 border-slate-200'
                                        }`}
                                        style={{ backgroundColor: color.code }}
                                        title={color.name}
                                    >
                                        {config.coverAccentColor === color.code && <span className="text-[6px] text-white">✓</span>}
                                    </button>
                                ))}
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Page Border & Background">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setConfig({ ...config, showPageBorder: !config.showPageBorder })}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                        config.showPageBorder ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                >
                                    Border: {config.showPageBorder ? 'On' : 'Off'}
                                </button>
                                <div className="w-[1px] h-3 bg-slate-200"></div>
                                <div className="flex gap-1 items-center">
                                    {[
                                        { code: '#ffffff', name: 'White' },
                                        { code: '#fafaf9', name: 'Warm' },
                                        { code: '#fefcbf', name: 'Ivory' },
                                        { code: '#f0fdf4', name: 'Mint' }
                                    ].map(color => (
                                        <button
                                            key={color.code}
                                            onClick={() => setConfig({ ...config, paperColor: color.code })}
                                            className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-all ${
                                                config.paperColor === color.code ? 'ring-2 ring-indigo-500 scale-110' : 'hover:scale-105 border-slate-200'
                                            }`}
                                            style={{ backgroundColor: color.code }}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                            </div>
                        </ToolbarGroup>

                        <ToolbarGroup label="Watermark Setup" onLauncherClick={() => handleLauncherClick('design', 'watermark')}>
                            <div className="flex items-center gap-2 px-2 text-[10px] font-bold text-slate-700">
                                <input type="checkbox" checked={config.watermark} onChange={e => setConfig({ ...config, watermark: e.target.checked })} id="wm-toggle" className="accent-indigo-600" />
                                <label htmlFor="wm-toggle" className="cursor-pointer">Enable Watermark</label>
                                {config.watermark && (
                                    <input
                                        type="text"
                                        value={config.watermarkText}
                                        onChange={e => setConfig({ ...config, watermarkText: e.target.value })}
                                        className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[10px] outline-none w-28 ml-2"
                                        placeholder="Watermark Text..."
                                    />
                                )}
                            </div>
                        </ToolbarGroup>
                    </>
                )}

                {activeTab === 'settings' && (
                    <div className="flex items-center px-4 py-2 text-xs font-bold text-slate-500 gap-2">
                        <Settings size={14} className="text-indigo-600 animate-pulse" />
                        <span>ডান প্রপার্টিজ প্যানেলে লেকচার শিটের অভ্যন্তরীণ লেআউট ও কোয়েশ্চেন সেটিংস কন্ট্রোল করুন।</span>
                    </div>
                )}
            </div>
        </header>
    );
};

export default LectureToolbar;
