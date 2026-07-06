import React from 'react';
import { SUBJECTS, CLASSES, EXAMS, GROUPS, BOARDS, BN_FONTS, EN_FONTS, PAGE_SIZES, HEADER_STYLES, SECTION_STYLES, WATERMARK_OPT } from './DocumentSettings';
import { Toggle, FL, G2, Num, Sel, Inp, Slide, ST, Seg, FieldDisplay, NumDisplay, CollapsibleBox, TypographyToolbar, Txt } from './SettingsComponents';
import { UI_TEXT } from './translations';
import { Lock, Unlock, AlignLeft, AlignCenter, AlignRight, AlignJustify, Trash2, ArrowUp, ArrowDown, FileText, Settings, ChevronDown, ChevronRight } from 'lucide-react';

export default function SettingsPanel({ s, u, uMulti, activeTab, uiLang, documentQuestions }) {
    const t = UI_TEXT[uiLang];
    const [isEditMode, setIsEditMode] = React.useState(true);
    const [sectionTabs, setSectionTabs] = React.useState({});
    const [collapsedSections, setCollapsedSections] = React.useState({});

    return (
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-white">
            {activeTab === "questionSetup" && <>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.sections || 'Sections'}</span>
                    <button 
                        onClick={() => {
                            const newSec = { 
                                id: 'sec-'+Date.now(), 
                                name: "নতুন বিভাগ", 
                                instructions: "", 
                                conditions: "", 
                                numberingStyle: "bn", 
                                marksConfig: "hide", 
                                optionLayout: "col1", 
                                isMCQ: false,
                                continuousNumbering: true,
                                numberingStart: 1,
                                fontFamily: ""
                            };
                            u("sections", [...(s.sections || []), newSec]);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                    >
                        + {t.addSection || 'Add Section'}
                    </button>
                </div>

                <div className="space-y-4">
                    {(s.sections || []).map((sec, idx) => {
                        const activeSubTab = sectionTabs[sec.id] || 'content';
                        const setActiveSubTab = (tab) => setSectionTabs(prev => ({ ...prev, [sec.id]: tab }));
                        const isCollapsed = collapsedSections[sec.id] !== undefined ? collapsedSections[sec.id] : idx > 0;
                        const toggleCollapse = () => setCollapsedSections(prev => ({ ...prev, [sec.id]: !isCollapsed }));
                        
                        return (
                            <div key={sec.id} className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm relative group hover:border-slate-300 hover:shadow-md transition-all ${isCollapsed ? 'p-3 pb-2.5' : 'p-4'}`}>
                                {/* Card Header */}
                                <div className={`flex items-center justify-between ${isCollapsed ? '' : 'border-b border-slate-100 pb-3 mb-3'}`}>
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer select-none group/hdr max-w-[65%]"
                                        onClick={toggleCollapse}
                                    >
                                        {isCollapsed ? (
                                            <ChevronRight size={15} className="text-slate-400 group-hover/hdr:text-indigo-600 transition-colors shrink-0" />
                                        ) : (
                                            <ChevronDown size={15} className="text-indigo-500 group-hover/hdr:text-indigo-600 transition-colors shrink-0" />
                                        )}
                                        <span className="w-5 h-5 flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold rounded-md text-[10px] border border-indigo-100/50 shadow-sm shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="font-bold text-slate-800 text-[13px] truncate group-hover/hdr:text-indigo-600 transition-colors">
                                            {sec.name || (uiLang === 'bn' ? 'নামহীন সেকশন' : 'Unnamed Section')}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5">
                                        {/* Type badge */}
                                        <button
                                            onClick={() => {
                                                const ns = [...s.sections];
                                                ns[idx] = { ...ns[idx], isMCQ: !ns[idx].isMCQ };
                                                u("sections", ns);
                                            }}
                                            className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border shadow-sm transition-all hover:scale-105 active:scale-95 ${sec.isMCQ 
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}
                                            title={uiLang === 'bn' ? 'প্রশ্ন টাইপ পরিবর্তন করুন' : 'Click to toggle type'}
                                        >
                                            {sec.isMCQ ? 'MCQ' : 'CQ'}
                                        </button>
                                        
                                        {/* Action toolbar */}
                                        <div className="flex items-center gap-1">
                                            <button 
                                                disabled={idx === 0}
                                                onClick={() => {
                                                    const ns = [...s.sections];
                                                    const temp = ns[idx];
                                                    ns[idx] = ns[idx - 1];
                                                    ns[idx - 1] = temp;
                                                    u("sections", ns);
                                                }}
                                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-50 rounded transition-colors"
                                                title={uiLang === 'bn' ? 'উপরে সরান' : 'Move Up'}
                                            >
                                                <ArrowUp size={13} />
                                            </button>
                                            <button 
                                                disabled={idx === s.sections.length - 1}
                                                onClick={() => {
                                                    const ns = [...s.sections];
                                                    const temp = ns[idx];
                                                    ns[idx] = ns[idx + 1];
                                                    ns[idx + 1] = temp;
                                                    u("sections", ns);
                                                }}
                                                className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-50 rounded transition-colors"
                                                title={uiLang === 'bn' ? 'নিচে সরান' : 'Move Down'}
                                            >
                                                <ArrowDown size={13} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm(uiLang === 'bn' ? 'আপনি কি এই সেকশনটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this section?')) {
                                                        const ns = [...s.sections]; ns.splice(idx,1); u("sections", ns);
                                                    }
                                                }}
                                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                                title={uiLang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Active Settings Overrides Badges (স্ট্যাটাস ইন্ডিকেটর) */}
                                <div className={`flex flex-wrap gap-1 ${isCollapsed ? 'mt-2' : 'mb-3'}`}>
                                    {sec.continuousNumbering === false && (
                                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-medium font-mono border border-slate-200/40">
                                            Reset: Q.{sec.numberingStart || 1}
                                        </span>
                                    )}
                                    {sec.fontFamily && (
                                        <span className="bg-indigo-50/50 text-indigo-600 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-indigo-100/40">
                                            Font: {sec.fontFamily}
                                        </span>
                                    )}
                                    {sec.columns > 1 && (
                                        <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-blue-100/50">
                                            {sec.columns} Col
                                        </span>
                                    )}
                                    {sec.fontSize && (
                                        <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[9px] font-semibold border border-amber-100/50">
                                            Size: {sec.fontSize}pt
                                        </span>
                                    )}
                                </div>

                                {/* Expanded Content Panel */}
                                {!isCollapsed && (
                                    <>
                                        {/* Tab Selector (Content vs Design) */}
                                        <div className="flex gap-1 bg-slate-50 p-1 rounded-xl mb-3 border border-slate-100">
                                            <button
                                                onClick={() => setActiveSubTab('content')}
                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${activeSubTab === 'content'
                                                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-800'}`}
                                            >
                                                <FileText size={12} />
                                                {uiLang === 'bn' ? 'বিষয়বস্তু' : 'Content'}
                                            </button>
                                            <button
                                                onClick={() => setActiveSubTab('design')}
                                                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all ${activeSubTab === 'design'
                                                    ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                                                    : 'text-slate-500 hover:text-slate-800'}`}
                                            >
                                                <Settings size={12} />
                                                {uiLang === 'bn' ? 'ডিজাইন ও লেআউট' : 'Design & Layout'}
                                            </button>
                                        </div>

                                        {/* Content Tab Pane */}
                                        {activeSubTab === 'content' && (
                                            <div className="space-y-3 pt-1">
                                                {/* Section Name */}
                                                <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3">
                                                    <FL label={uiLang === 'bn' ? 'বিভাগের নাম' : 'Section Name'} toggleKey="showName" toggleVal={sec.showName !== false} onToggle={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }}>
                                                        <Inp 
                                                            value={sec.name} 
                                                            disabled={sec.showName === false}
                                                            onChange={v => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], name: v }; u("sections", ns); }} 
                                                        />
                                                    </FL>
                                                    {sec.showName !== false && (
                                                        <TypographyToolbar 
                                                            state={{
                                                                ...sec,
                                                                nameBg: sec.nameBg !== undefined ? sec.nameBg : s.sectionStyle === 'কালো ব্যাকগ্রাউন্ড',
                                                                nameDivider: sec.nameDivider !== undefined ? sec.nameDivider : ['বর্ডার বক্স', 'আন্ডারলাইন', 'ডটেড লাইন'].includes(s.sectionStyle)
                                                            }} 
                                                            prefix="name" 
                                                            onChange={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }} 
                                                        />
                                                    )}
                                                </div>

                                                {/* Conditions */}
                                                <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3">
                                                    <FL label={uiLang === 'bn' ? 'শর্তাবলী (যেমন: মান: ১০x৭=৭০)' : 'Conditions'} toggleKey="showConditions" toggleVal={sec.showConditions !== false} onToggle={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }}>
                                                        <Inp 
                                                            value={sec.conditions || ''} 
                                                            disabled={sec.showConditions === false}
                                                            onChange={v => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], conditions: v }; u("sections", ns); }} 
                                                        />
                                                    </FL>
                                                    {sec.showConditions !== false && (
                                                        <TypographyToolbar 
                                                            state={sec} 
                                                            prefix="cond" 
                                                            onChange={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }} 
                                                        />
                                                    )}
                                                </div>

                                                {/* Instructions */}
                                                <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3">
                                                    <FL label={uiLang === 'bn' ? 'নির্দেশনাবলী' : 'Instructions'} toggleKey="showInstructions" toggleVal={sec.showInstructions !== false} onToggle={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }}>
                                                        <Txt 
                                                            className="w-full text-[13px] p-2.5 border border-slate-200 rounded-md outline-none focus:border-indigo-400 min-h-[50px] resize-y disabled:opacity-50 bg-white"
                                                            value={sec.instructions || ''}
                                                            disabled={sec.showInstructions === false}
                                                            onChange={v => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], instructions: v }; u("sections", ns); }}
                                                        />
                                                    </FL>
                                                    {sec.showInstructions !== false && (
                                                        <TypographyToolbar 
                                                            state={sec} 
                                                            prefix="inst" 
                                                            onChange={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }} 
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Design Tab Pane */}
                                        {activeSubTab === 'design' && (
                                            <div className="space-y-3.5 pt-1">
                                                {/* Numbering & Layout Settings Row */}
                                                <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 space-y-3">
                                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{uiLang === 'bn' ? 'নম্বরক্রম ও লেআউট' : 'Numbering & Layout'}</div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <FL label={t.numberingStyle || 'Numbering'}>
                                                            <Sel value={sec.numberingStyle} onChange={v => {
                                                                const ns = [...s.sections]; ns[idx] = { ...ns[idx], numberingStyle: v }; u("sections", ns);
                                                            }} opts={[
                                                                {v: 'bn', l: '১, ২, ৩'},
                                                                {v: 'en', l: '1, 2, 3'},
                                                                {v: 'roman', l: 'i, ii, iii'},
                                                                {v: 'alpha', l: 'ক, খ, গ'},
                                                                {v: 'hide', l: 'Hide'}
                                                            ]} />
                                                        </FL>
                                                        <FL label={t.marksConfig || 'Marks'}>
                                                            <Sel value={sec.marksConfig} onChange={v => {
                                                                const ns = [...s.sections]; ns[idx] = { ...ns[idx], marksConfig: v }; u("sections", ns);
                                                            }} opts={[
                                                                {v: 'hide', l: 'Hide'},
                                                                {v: 'showRight', l: 'Right Align'},
                                                                {v: 'showBracket', l: 'In Bracket'}
                                                            ]} />
                                                        </FL>
                                                    </div>

                                                    {/* Continuous Numbering controls */}
                                                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/40">
                                                        <FL label={uiLang === 'bn' ? 'ক্রমাগত নম্বরক্রম' : 'Continuous Numbering'}>
                                                            <Seg 
                                                                value={sec.continuousNumbering !== false ? 'yes' : 'no'} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; 
                                                                    ns[idx] = { 
                                                                        ...ns[idx], 
                                                                        continuousNumbering: (v === 'yes'),
                                                                        numberingStart: v === 'no' ? (ns[idx].numberingStart || 1) : undefined
                                                                    }; 
                                                                    u("sections", ns);
                                                                }}
                                                                opts={[
                                                                    {v: 'yes', l: uiLang === 'bn' ? 'হ্যাঁ' : 'Yes'},
                                                                    {v: 'no', l: uiLang === 'bn' ? 'না' : 'No'}
                                                                ]}
                                                            />
                                                        </FL>
                                                        <FL label={uiLang === 'bn' ? 'শুরু করার নম্বর' : 'Start Number'}>
                                                            <Num 
                                                                min={1}
                                                                disabled={sec.continuousNumbering !== false}
                                                                value={sec.numberingStart !== undefined ? sec.numberingStart : 1} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; 
                                                                    ns[idx] = { ...ns[idx], numberingStart: Number(v) || 1 }; 
                                                                    u("sections", ns);
                                                                }}
                                                            />
                                                        </FL>
                                                    </div>
                                                </div>

                                                {/* MCQ Settings (only shown if isMCQ is true) */}
                                                {sec.isMCQ && (
                                                    <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 space-y-3">
                                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{uiLang === 'bn' ? 'বহুনির্বাচনী অপশন সেটিংস' : 'MCQ Option Settings'}</div>
                                                        
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <FL label={uiLang === 'bn' ? 'অপশন স্টাইল' : 'Option Style'}>
                                                                <Sel value={sec.optionStyle || 'bn'} onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], optionStyle: v }; u("sections", ns);
                                                                }} opts={[
                                                                    {v: 'bn', l: t.optBn || 'ক, খ, গ, ঘ'},
                                                                    {v: 'en', l: t.optEn || 'a, b, c, d'},
                                                                    {v: 'roman', l: t.optRoman || 'i, ii, iii, iv'},
                                                                    {v: 'num_bn', l: t.optNumBn || '১, ২, ৩, ৪'},
                                                                    {v: 'num_en', l: t.optNumEn || '1, 2, 3, 4'}
                                                                ]} />
                                                            </FL>
                                                            <FL label={uiLang === 'bn' ? 'অপশন লেআউট' : 'Option Layout'}>
                                                                <div className="flex flex-col gap-1 w-full">
                                                                    <Sel value={sec.optionLayout} onChange={v => {
                                                                        const ns = [...s.sections]; ns[idx] = { ...ns[idx], optionLayout: v }; u("sections", ns);
                                                                    }} opts={[
                                                                        {v: 'col1', l: t.col1 || '1 Col'},
                                                                        {v: 'col2', l: t.col2 || '2 Cols'},
                                                                        {v: 'col4', l: t.col4 || '4 Cols'}
                                                                    ]} />
                                                                    <label className="flex items-center gap-1.5 mt-1 ml-1 cursor-pointer group w-max">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={sec.smartFit !== false} 
                                                                            onChange={e => {
                                                                                const ns = [...s.sections]; ns[idx] = { ...ns[idx], smartFit: e.target.checked }; u("sections", ns);
                                                                            }} 
                                                                            className="rounded border-slate-300 text-indigo-500 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 w-3 h-3 cursor-pointer"
                                                                        />
                                                                        <span className="text-[10px] text-slate-500 font-bold group-hover:text-indigo-600 transition-colors select-none font-sans">
                                                                            {t.smartFit || 'Smart Fit'}
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            </FL>
                                                        </div>
                                                        
                                                        <div>
                                                            <FL label={uiLang === 'bn' ? 'অপশন মার্কার' : 'Option Marker'}>
                                                                <Sel value={sec.optionDecoration || 'rightBracket'} onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], optionDecoration: v }; u("sections", ns);
                                                                }} opts={[
                                                                    {v: 'rightBracket', l: t.rightBracket || 'ক)'},
                                                                    {v: 'dot', l: t.dot || 'ক.'},
                                                                    {v: 'bracket', l: t.bothBracket || '(ক)'},
                                                                    {v: 'bubble', l: t.bubble || 'OMR Bubble'}
                                                                ]} />
                                                            </FL>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Typography & Fonts Override */}
                                                <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 space-y-3">
                                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{uiLang === 'bn' ? 'ফন্ট এবং সাইজ' : 'Typography & Size'}</div>
                                                    
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <FL label={uiLang === 'bn' ? 'ফন্ট ফ্যামিলি' : 'Font Family'}>
                                                            <Sel 
                                                                value={sec.fontFamily || ''} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], fontFamily: v }; u("sections", ns);
                                                                }} 
                                                                opts={[
                                                                    { v: '', l: uiLang === 'bn' ? 'ডিফল্ট (ইনহেরিট)' : 'Default (Inherit)' },
                                                                    ...BN_FONTS.map(f => ({ v: f, l: f })),
                                                                    ...EN_FONTS.map(f => ({ v: f, l: f }))
                                                                ]} 
                                                            />
                                                        </FL>
                                                        <FL label={uiLang === 'bn' ? 'ফন্ট সাইজ (pt)' : 'Font Size (pt)'}>
                                                            <Num 
                                                                value={sec.fontSize !== undefined ? sec.fontSize : (s.bodyFontSize || 14)} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], fontSize: v }; u("sections", ns);
                                                                }}
                                                            />
                                                        </FL>
                                                    </div>
                                                </div>

                                                {/* Columns & Gaps Override */}
                                                <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-3 space-y-3">
                                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{uiLang === 'bn' ? 'কলাম এবং ফাকা স্থান (Spacing)' : 'Columns & Spacing'}</div>
                                                    
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <FL label={uiLang === 'bn' ? 'কলাম' : 'Columns'} help={s.columns > 1 ? (uiLang === 'bn' ? 'গ্লোবাল কলাম সক্রিয়' : 'Global Active') : ''}>
    <Sel 
        value={s.columns > 1 ? s.columns : (sec.columns || 1)} 
        disabled={s.columns > 1}
        onChange={v => {
            const ns = [...s.sections]; ns[idx] = { ...ns[idx], columns: Number(v) }; u("sections", ns);
        }} 
        opts={[
            {v: 1, l: uiLang === 'bn' ? '১ কলাম' : '1 Column'},
            {v: 2, l: uiLang === 'bn' ? '২ কলাম' : '2 Columns'},
            {v: 3, l: uiLang === 'bn' ? '৩ কলাম' : '3 Columns'}
        ]} 
    />
</FL>
                                                        <FL label={uiLang === 'bn' ? 'বর্ডার' : 'Border'}>
                                                            <Seg 
                                                                value={sec.columnBorder === true ? 'yes' : 'no'} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], columnBorder: (v === 'yes') }; u("sections", ns);
                                                                }}
                                                                opts={[
                                                                    {v: 'yes', l: uiLang === 'bn' ? 'হ্যাঁ' : 'Yes'},
                                                                    {v: 'no', l: uiLang === 'bn' ? 'না' : 'No'}
                                                                ]}
                                                            />
                                                        </FL>
                                                        <FL label={uiLang === 'bn' ? 'গ্যাপ(mm)' : 'Gap(mm)'}>
                                                            <Num 
                                                                value={sec.colGap !== undefined ? sec.colGap : (s.colGap || 10)} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], colGap: v }; u("sections", ns);
                                                                }}
                                                            />
                                                        </FL>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-2">
                                                        <FL label={uiLang === 'bn' ? 'লাইন গ্যাপ' : 'Line Gap'}>
                                                            <Num 
                                                                step={0.1} min={0.1} max={5.0}
                                                                value={sec.lineGap !== undefined ? sec.lineGap : (s.lineHeight || 1.5)} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], lineGap: v }; u("sections", ns);
                                                                }}
                                                            />
                                                        </FL>
                                                        <FL label={uiLang === 'bn' ? 'অপশন (px)' : 'Option (px)'}>
                                                            <Num 
                                                                min={-50} max={100}
                                                                value={sec.optionGap !== undefined ? sec.optionGap : 8} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], optionGap: v }; u("sections", ns);
                                                                }}
                                                            />
                                                        </FL>
                                                        <FL label={uiLang === 'bn' ? 'প্রশ্ন (px)' : 'Question (px)'}>
                                                            <Num 
                                                                min={-100} max={150}
                                                                value={sec.questionGap !== undefined ? sec.questionGap : (s.questionGap || 15)} 
                                                                onChange={v => {
                                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], questionGap: v }; u("sections", ns);
                                                                }}
                                                            />
                                                        </FL>
                                                    </div>

                                                    <div>
                                                        <FL label={uiLang === 'bn' ? 'অ্যালাইনমেন্ট' : 'Alignment'}>
                                                            <div className="flex gap-[2px] h-full">
                                                                {['left', 'center', 'right', 'justify'].map(align => (
                                                                    <button 
                                                                        key={align}
                                                                        onClick={() => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], textAlign: align }; u("sections", ns); }}
                                                                        className={`flex-1 py-1.5 px-0 rounded border transition-colors flex justify-center items-center ${sec.textAlign === align || (!sec.textAlign && align === 'left') ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                                        title={align.charAt(0).toUpperCase() + align.slice(1)}
                                                                    >
                                                                        {align === 'left' && <AlignLeft size={14}/>}
                                                                        {align === 'center' && <AlignCenter size={14}/>}
                                                                        {align === 'right' && <AlignRight size={14}/>}
                                                                        {align === 'justify' && <AlignJustify size={14}/>}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </FL>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </>}

            {activeTab === "examInfo" && <>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.examInfo || 'Exam Info'}</span>
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)} 
                        className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1.5 ${isEditMode ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                        {isEditMode ? <><Unlock size={12}/> Lock Details</> : <><Lock size={12}/> Edit Mode</>}
                    </button>
                </div>
                
                <div className="space-y-4">
                    {/* Institute Card */}
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{t.institute || 'Institute Details'}</h3>
                        </div>
                        <div className="space-y-2">
                            <FL label={t.name} toggleKey="showInstitute" toggleVal={s.showInstitute!==false} onToggle={u}>
                                <FieldDisplay isEdit={isEditMode} value={s.institute} onChange={v=>u("institute",v)} />
                            </FL>
                            <FL label={t.board} toggleKey="showBoard" toggleVal={s.showBoard} onToggle={u}>
                                <FieldDisplay isEdit={isEditMode} value={s.board} onChange={v=>u("board",v)} />
                            </FL>
                        </div>
                    </div>

                    {/* Exam Properties Card */}
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{t.examDetails || 'Exam Properties'}</h3>
                        </div>
                        <div className="space-y-3">
                            <FL label={t.examType} toggleKey="showExamType" toggleVal={s.showExamType!==false} onToggle={u}>
                                <FieldDisplay isEdit={isEditMode} value={s.exam} onChange={v=>u("exam",v)} disabled={s.showExamType===false} />
                            </FL>
                            <FL label={t.subject} toggleKey="showSubject" toggleVal={s.showSubject!==false} onToggle={u}>
                                <FieldDisplay isEdit={isEditMode} value={s.subject} onChange={v=>u("subject",v)} disabled={s.showSubject===false} />
                            </FL>
                            <G2>
                                <FL label={t.class} toggleKey="showClass" toggleVal={s.showClass!==false} onToggle={u}>
                                    <FieldDisplay isEdit={isEditMode} value={s.className} onChange={v=>u("className",v)} disabled={s.showClass===false} />
                                </FL>
                                <FL label={t.group} toggleKey="showGroup" toggleVal={s.showGroup} onToggle={u}>
                                    <FieldDisplay isEdit={isEditMode} value={s.group} onChange={v=>u("group",v)} disabled={!s.showGroup} />
                                </FL>
                            </G2>
                            <G2>
                                <FL label={t.subjectCode || 'Subject Code'} toggleKey="showSubjectCode" toggleVal={s.showSubjectCode} onToggle={u}>
                                    <FieldDisplay isEdit={isEditMode} value={s.subjectCode} onChange={v=>u("subjectCode",v)} disabled={!s.showSubjectCode} />
                                </FL>
                                <FL label={t.setCode || 'Set Code'} toggleKey="showSetCode" toggleVal={s.showSetCode} onToggle={u}>
                                    <FieldDisplay isEdit={isEditMode} value={s.setCode} onChange={v=>u("setCode",v)} disabled={!s.showSetCode} />
                                </FL>
                            </G2>
                            <G2>
                                <FL label={t.year} toggleKey="showYear" toggleVal={s.showYear!==false} onToggle={u}>
                                    <FieldDisplay isEdit={isEditMode} value={s.year} onChange={v=>u("year",v)} disabled={s.showYear===false} />
                                </FL>
                                <FL label={t.time} toggleKey="showTime" toggleVal={s.showTime!==false} onToggle={u}>
                                    <FieldDisplay isEdit={isEditMode} value={s.time} onChange={v=>u("time",v)} disabled={s.showTime===false} />
                                </FL>
                            </G2>
                            <G2>
                                <FL label={t.fullMarks} toggleKey="showTotalMarks" toggleVal={s.showTotalMarks!==false} onToggle={u}>
                                    <NumDisplay isEdit={isEditMode} value={s.totalMarks} onChange={v=>u("totalMarks",v)} min={10} max={300} disabled={s.showTotalMarks===false} />
                                </FL>
                                <FL label={t.footer || 'Footer'} toggleKey="showFooter" toggleVal={s.showFooter} onToggle={u}>
                                    <FieldDisplay isEdit={isEditMode} value={s.footerText || ''} onChange={v=>u("footerText",v)} disabled={!s.showFooter} />
                                </FL>
                            </G2>
                        </div>
                    </div>

                    {/* Meta & Styling Card */}
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3.5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{t.candidate || 'Candidate Info'}</h3>
                        </div>
                        <div className="space-y-2 mb-3">
                            {[[t.nameField || 'Name Field', "showName"], [t.rollField || 'Roll Field',"showRoll"],[t.regField || 'Reg Field',"showReg"]].map(([lbl,k])=>(
                                <div key={k} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                                    <span className="text-xs text-slate-600 font-bold">{lbl}</span>
                                    <Toggle checked={s[k]} onChange={e=>u(k,e.target.checked)}/>
                                </div>
                            ))}
                        </div>
                        
                        {(s.showName || s.showRoll || s.showReg) && (
                            <div className="mb-4">
                                <FL label={t.candLayout || 'Layout View'}>
                                    <Seg value={s.candidateLayout || 'stacked'} onChange={v=>u("candidateLayout",v)}
                                        opts={[{v:"inline",l:t.inline || 'Inline'},{v:"stacked",l:t.stacked || 'Stacked'}]}/>
                                </FL>
                            </div>
                        )}
                    </div>
                </div>
            </>}

            {activeTab === "pageSetup" && <>
                <div className="mb-6">
                    <ST>{t.pageSize || 'Page Size'}</ST>
                    <FL label={t.selectSize || 'Select Size'}><Sel value={s.pageSize} onChange={v=>u("pageSize",v)} opts={Object.keys(PAGE_SIZES)}/></FL>
                    {s.pageSize!=="Custom" && <div className="text-[11px] text-slate-500 mb-3 bg-slate-50 p-2 rounded">{PAGE_SIZES[s.pageSize].label}</div>}
                    {s.pageSize==="Custom" && <G2>
                    <FL label={t.widthMm || 'Width'}><Num value={s.customW} onChange={v=>u("customW",v)} min={50} max={600}/></FL>
                    <FL label={t.heightMm || 'Height'}><Num value={s.customH} onChange={v=>u("customH",v)} min={50} max={900}/></FL>
                    </G2>}
                    
                    <ST>{t.orientation || 'Orientation'}</ST>
                    <Seg value={s.orientation} onChange={v=>u("orientation",v)}
                    opts={[{v:"portrait",l:t.portrait || 'Portrait'},{v:"landscape",l:t.landscape || 'Landscape'}]}/>
                    
                    <ST>{t.columnLayout || 'Column Layout'}</ST>
                    <FL label={t.colCount || 'Column Count'}>
                    <Seg value={s.columns} onChange={v=>{
                        const cols = Number(v);
                        const updatedSections = (s.sections || []).map(sec => ({
                            ...sec,
                            columns: cols
                        }));
                        uMulti({
                            columns: cols,
                            sections: updatedSections
                        });
                    }} opts={[{v:1,l:t.oneCol || '1'},{v:2,l:t.twoCol || '2'}]}/>
                    </FL>
                    {s.columns>1 && (
                        <>
                            <FL label={t.colGap || 'Column Gap'}><Slide value={s.colGap} onChange={v=>u("colGap",v)} min={5} max={30}/></FL>
                            <div className="flex items-center justify-between mt-3 mb-1">
                                <span className="text-xs text-slate-600 font-bold">{uiLang === 'bn' ? 'কলামের মাঝে বর্ডার' : 'Border Between Columns'}</span>
                                <Toggle checked={s.columnBorder !== false} onChange={e=>u("columnBorder",e.target.checked)}/>
                            </div>
                        </>
                    )}
                </div>
                <div className="w-full h-px bg-slate-200 mb-4"></div>
                <ST>{t.marginsMm}</ST>
                <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-100">
                <div className="flex justify-center mb-2">
                    <div className="w-16 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-bold">{t.top}</div>
                    <Num value={s.marginTop} onChange={v=>u("marginTop",v)} min={0} max={80}/>
                    </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-16 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-bold">{t.left}</div>
                    <Num value={s.marginLeft} onChange={v=>u("marginLeft",v)} min={0} max={80}/>
                    </div>
                    <div className="flex-1 h-12 border border-dashed border-slate-300 rounded flex items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-bold">{t.page}</span>
                    </div>
                    <div className="w-16 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-bold">{t.right}</div>
                    <Num value={s.marginRight} onChange={v=>u("marginRight",v)} min={0} max={80}/>
                    </div>
                </div>
                <div className="flex justify-center">
                    <div className="w-16 text-center">
                    <div className="text-[10px] text-slate-500 mb-1 font-bold">{t.bottom}</div>
                    <Num value={s.marginBottom} onChange={v=>u("marginBottom",v)} min={0} max={80}/>
                    </div>
                </div>
                </div>
                <ST>{t.presetMargins}</ST>
                {[{n:t.narrow,t:12,b:12,l:15,r:15},{n:t.normal,t:20,b:20,l:25,r:20},{n:t.wide,t:25,b:25,l:30,r:30},{n: uiLang === 'bn' ? 'সংক্ষিপ্ত (জিরো মার্জিন)' : 'Compact (Zero Margin)', t:5,b:5,l:5,r:5},{n: uiLang === 'bn' ? 'প্রশস্ত ওয়ার্কশিট' : 'Wide Worksheet', t:30,b:30,l:35,r:35}].map(p=>(
                <button key={p.n} className="w-full text-left px-3 py-2 border border-slate-200 rounded-md text-xs text-slate-600 mb-2 hover:bg-indigo-50 hover:border-indigo-200 font-medium" 
                        onClick={()=>uMulti({marginTop:p.t,marginBottom:p.b,marginLeft:p.l,marginRight:p.r})}>
                    {p.n} — ↑{p.t} ↓{p.b} ←{p.l} →{p.r}
                </button>
                ))}
                
                <div className="w-full h-px bg-slate-200 my-4"></div>
                <ST>{uiLang === 'bn' ? 'প্রিন্ট ফিট (Print Fit)' : 'Print Fit'}</ST>
                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 mb-2">
                    <p className="text-[10px] text-indigo-600 mb-2 font-medium leading-relaxed">
                        {uiLang === 'bn' 
                            ? 'প্রিন্ট করার সময় পেজ বেড়ে গেলে এটি কমিয়ে ফিট করতে পারেন।' 
                            : 'Reduce scale to fit contents into fewer printed pages.'}
                    </p>
                    <FL label={uiLang === 'bn' ? 'প্রিন্ট স্কেল (%)' : 'Print Scale (%)'}>
                        <Sel value={s.printScale || 100} onChange={v=>u("printScale", Number(v))} opts={[
                            {v: 100, l: '100% (Normal)'},
                            {v: 98, l: '98% (Slight Shrink)'},
                            {v: 96, l: '96% (Fit More)'},
                            {v: 94, l: '94% (Compact)'},
                            {v: 90, l: '90% (Maximum Shrink)'}
                        ]} />
                    </FL>
                </div>
            </>}


            {activeTab === "design" && <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 bg-indigo-50/30">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest">{uiLang === 'bn' ? 'হেডার ডিজাইন (Header)' : 'Header Design'}</span>
                    </div>
                    <div className="p-4 bg-white">
                        <FL label={t.headerBorder || 'Header Style'}><Sel value={s.headerStyle} onChange={v=>u("headerStyle",v)} opts={HEADER_STYLES}/></FL>
                    
                    <div className="w-full h-px bg-slate-200 my-4"></div>
                    <div className="w-full h-px bg-slate-200 my-4"></div>
                    <ST>{t.fontSizePt}</ST>
                    <FL label={t.instHeader}><Slide value={s.headerFontSize} onChange={v=>u("headerFontSize",v)} min={12} max={36}/></FL>
                    <FL label={uiLang === 'bn' ? 'সাব হেডার, সময় ও পূর্ণমান' : 'Sub-header, Time & Marks'}><Slide value={s.subHeaderFontSize} onChange={v=>u("subHeaderFontSize",v)} min={10} max={22}/></FL>
                    <FL label={uiLang === 'bn' ? 'হেডার লাইন গ্যাপ' : 'Header Line Gap'}><Slide value={s.headerLineHeight || 1.2} onChange={v=>u("headerLineHeight",v)} min={1.0} max={3.0} step={0.1}/></FL>
                    <ST>{t.bold}</ST>
                    {[[t.instBold,"boldInstitute"],[t.subBold,"boldSubject"]].map(([l,k])=>(
                    <div key={k} className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-bold">{l}</span>
                        <Toggle checked={s[k]} onChange={e=>u(k,e.target.checked)}/>
                    </div>
                    ))}
                    
                    <div className="w-full h-px bg-slate-200 my-4"></div>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-600 font-bold">{t.dividerLine || 'Show Header Divider'}</span>
                        <Toggle checked={s.showDivider} onChange={e=>u("showDivider",e.target.checked)}/>
                    </div>
                    {s.showDivider && (
                        <FL label={t.dividerType || 'Divider Style'}>
                            <Seg value={s.dividerStyle} onChange={v=>u("dividerStyle",v)}
                                opts={[{v:"solid",l:t.solid || 'Solid'},{v:"double",l:t.double || 'Double'},{v:"dashed",l:t.dashed || 'Dashed'}]}/>
                        </FL>
                    )}
                    </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 bg-indigo-50/30">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest">{uiLang === 'bn' ? 'বডি ডিজাইন (Body)' : 'Body Design'}</span>
                    </div>
                    <div className="p-4 bg-white">
                        <ST>{t.bnFont}</ST>
                    <FL label={t.fontFamily}><Sel value={s.bnFont} onChange={v=>u("bnFont",v)} opts={BN_FONTS}/></FL>
                    <ST>{t.enFont}</ST>
                    <FL label={t.fontFamily}><Sel value={s.enFont} onChange={v=>u("enFont",v)} opts={EN_FONTS}/></FL>
                    
                    <div className="w-full h-px bg-slate-200 my-4"></div>
                    <FL label={t.style || 'Section Header Style'}><Sel value={s.sectionStyle} onChange={v=>u("sectionStyle",v)} opts={SECTION_STYLES}/></FL>
                    
                    <div className="w-full h-px bg-slate-200 my-4"></div>
                    <FL label={t.lineHeight || 'Line Spacing'}><Slide value={s.lineHeight || 1.5} onChange={v=>u("lineHeight",v)} min={1.0} max={3.0} step={0.1}/></FL>
                    <FL label={t.qGap || 'Question Gap'}><Slide value={s.questionGap || 14} onChange={v=>u("questionGap",v)} min={4} max={40}/></FL>
                    <FL label={t.secGap || 'Section Gap'}><Slide value={s.sectionGap || 16} onChange={v=>u("sectionGap",v)} min={8} max={50}/></FL>
                    </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 bg-indigo-50/30">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest">{uiLang === 'bn' ? 'সম্পূর্ণ পেজ (Page)' : 'Page Design'}</span>
                    </div>
                    <div className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500 font-bold">{t.outerBorder || 'Outer Border'}</span>
                        <Toggle checked={s.outerBorder} onChange={e=>u("outerBorder",e.target.checked)}/>
                    </div>
                    {s.outerBorder && <FL label={t.thickness || 'Thickness'}><Slide value={s.outerBorderWidth} onChange={v=>u("outerBorderWidth",v)} min={1} max={8}/></FL>}
                    
                    <div className="w-full h-px bg-slate-200 my-4"></div>
                    
                    <FL label={t.type || 'Watermark'}><Sel value={s.watermark} onChange={v=>u("watermark",v)} opts={WATERMARK_OPT}/></FL>
                    {s.watermark==="কাস্টম" && <FL label={t.customText || 'Custom Text'}><Inp value={s.watermarkCustom} onChange={v=>u("watermarkCustom",v)}/></FL>}
                    {s.watermark!=="কোনোটি নয়" && <FL label={t.opacity || 'Opacity'}><Slide value={s.watermarkOpacity} onChange={v=>u("watermarkOpacity",v)} min={3} max={30}/></FL>}
                    </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 bg-indigo-50/30">
                        <span className="text-xs font-bold text-indigo-900 uppercase tracking-widest">{uiLang === 'bn' ? 'ফুটার ডিজাইন (Footer)' : 'Footer Design'}</span>
                    </div>
                    <div className="p-4 bg-white">
                        <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500 font-bold">{t.showPageNo || 'Show Page No'}</span>
                        <Toggle checked={s.showPageNumber} onChange={e=>u("showPageNumber",e.target.checked)}/>
                    </div>
                    {s.showPageNumber && <FL label={t.position || 'Position'}>
                        <Seg value={s.pageNumberPos} onChange={v=>u("pageNumberPos",v)}
                            opts={[{v:"left",l:t.left || 'Left'},{v:"center",l:t.center || 'Center'},{v:"right",l:t.right || 'Right'}]}/>
                    </FL>}
                    </div>
                </div>
            </div>}

            {activeTab === "answerSheet" && <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-4 bg-teal-500 rounded-full"></div>
                        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{t.ansLayout || 'Layout Style'}</h3>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${s.ansLayout === 'compact' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                            <input type="radio" name="ansLayout" checked={s.ansLayout === 'compact'} onChange={() => u('ansLayout', 'compact')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${s.ansLayout === 'compact' ? 'text-indigo-900' : 'text-slate-700'}`}>{t.compactView || 'Compact View'}</span>
                                <span className="text-[11px] text-slate-500 font-medium">১. ক | ২. গ | ৩. ঘ (For OMR / Quick checking)</span>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${s.ansLayout === 'highlighted' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                            <input type="radio" name="ansLayout" checked={s.ansLayout === 'highlighted'} onChange={() => u('ansLayout', 'highlighted')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${s.ansLayout === 'highlighted' ? 'text-indigo-900' : 'text-slate-700'}`}>{t.highlightedView || 'Highlighted View'}</span>
                                <span className="text-[11px] text-slate-500 font-medium">Shows options with correct answer highlighted</span>
                            </div>
                        </label>

                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${s.ansLayout === 'detailed' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:border-indigo-300'}`}>
                            <input type="radio" name="ansLayout" checked={s.ansLayout === 'detailed'} onChange={() => u('ansLayout', 'detailed')} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500" />
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${s.ansLayout === 'detailed' ? 'text-indigo-900' : 'text-slate-700'}`}>{t.detailedView || 'Detailed View'}</span>
                                <span className="text-[11px] text-slate-500 font-medium">Full question, answer text, and explanations</span>
                            </div>
                        </label>
                    </div>

                    <div className="mt-6">
                        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-4 rounded-xl shadow-sm">
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-indigo-900">{uiLang === 'bn' ? 'প্রশ্নপত্রে উত্তর চিহ্নিত করুন' : 'Highlight Answers in Paper'}</span>
                                <span className="text-[11px] text-indigo-700">{uiLang === 'bn' ? 'সঠিক উত্তরগুলো প্রশ্নপত্রের ভেতরেই চিহ্নিত হয়ে থাকবে' : 'Correct answers will be highlighted inside the question paper'}</span>
                            </div>
                            <Toggle checked={s.includeAnswerSheet} onChange={e => u("includeAnswerSheet", e.target.checked)}/>
                        </div>
                    </div>

                    {/* Inline Answer/Explanation/Source Controls */}
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                        <div className="text-[11px] font-black text-emerald-800 uppercase tracking-widest mb-1">
                            {uiLang === 'bn' ? 'উত্তর ও ব্যাখ্যা প্রদর্শন' : 'Inline Answer & Explanation'}
                        </div>
                        <p className="text-[10px] text-emerald-700 leading-relaxed">
                            {uiLang === 'bn' 
                                ? 'প্রতিটি প্রশ্নের নিচে সরাসরি উত্তর ও ব্যাখ্যা দেখান। শিক্ষকের গাইড বা সমাধানপত্র তৈরিতে ব্যবহার করুন।' 
                                : 'Show answers and explanations inline below each question.'}
                        </p>
                        {[
                            { key: 'showAnswersInline', labelBn: 'সঠিক উত্তর দেখান', labelEn: 'Show Correct Answers', descBn: 'প্রতিটি প্রশ্নের নিচে উত্তর', descEn: 'Answer below each question' },
                            { key: 'showExplanationInline', labelBn: 'ব্যাখ্যা দেখান', labelEn: 'Show Explanations', descBn: 'বিস্তারিত ব্যাখ্যা প্রদর্শন', descEn: 'Detailed explanation' },
                            { key: 'showSources', labelBn: 'সোর্স/অধ্যায় দেখান', labelEn: 'Show Source/Chapter', descBn: 'প্রশ্নের পাশে উৎস দেখাবে', descEn: 'Source chapter next to question' }
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-emerald-100">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-700 block">{uiLang === 'bn' ? item.labelBn : item.labelEn}</span>
                                    <span className="text-[9px] text-slate-400">{uiLang === 'bn' ? item.descBn : item.descEn}</span>
                                </div>
                                <Toggle checked={s[item.key] || false} onChange={e => u(item.key, e.target.checked)}/>
                            </div>
                        ))}
                    </div>
                </div>
            </div>}

            {activeTab === "setCode" && <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl border border-slate-200/60 p-4 shadow-sm">
                    {/* Header Banner */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 mb-4 flex items-start gap-3">
                        <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600 shrink-0">
                            <Settings size={18} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-indigo-900 leading-tight">
                                {uiLang === 'bn' ? 'সেট কোড সেটিংস' : 'Set Code Settings'}
                            </h3>
                            <p className="text-[11px] text-indigo-750/90 leading-normal font-semibold mt-1">
                                {uiLang === 'bn' 
                                    ? 'ওএমআর (OMR) মূল্যায়নের জন্য একই পরীক্ষার একাধিক সেট কোড তৈরি করুন। প্রতিটি সেটের প্রশ্ন ও অপশনের ডিস্ট্রিবিউশন সিকোয়েন্স ওএমআর রিডারের সাথে স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।'
                                    : 'Create multiple sets of the exam for OMR grading. The question and option shuffle sequences are generated deterministically.'}
                            </p>
                        </div>
                    </div>

                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-4">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">{uiLang === 'bn' ? 'মাল্টিপল সেট সক্রিয় করুন' : 'Enable Multiple Sets'}</span>
                            <span className="text-[11px] text-slate-400">{uiLang === 'bn' ? 'MCQ প্রশ্নের একাধিক সেট জেনারেট করুন' : 'Generate multiple sets for MCQ questions'}</span>
                        </div>
                        <Toggle 
                            checked={s.multipleSetsEnabled || false} 
                            onChange={e => {
                                const enabled = e.target.checked;
                                const updates = { multipleSetsEnabled: enabled };
                                if (enabled && !s.setCodeSeedSalt) {
                                    updates.setCodeSeedSalt = Math.floor(Math.random() * 1000000) + 1;
                                }
                                uMulti(updates);
                            }}
                        />
                    </div>

                    {s.multipleSetsEnabled && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-250">
                            {/* Set Count */}
                            <FL label={uiLang === 'bn' ? 'সেট সংখ্যা' : 'Number of Sets'}>
                                <Seg 
                                    value={s.setCount || 4} 
                                    onChange={v => u("setCount", Number(v))} 
                                    opts={[
                                        { v: 2, l: uiLang === 'bn' ? '২টি সেট (ক, খ)' : '2 Sets (A, B)' },
                                        { v: 4, l: uiLang === 'bn' ? '৪টি সেট (ক, খ, গ, ঘ)' : '4 Sets (A, B, C, D)' }
                                    ]}
                                />
                            </FL>

                            {/* Set Naming Language */}
                            <FL label={uiLang === 'bn' ? 'সেটের নাম' : 'Set Naming Type'}>
                                <Seg 
                                    value={s.setLanguage || 'BN'} 
                                    onChange={v => u("setLanguage", v)} 
                                    opts={[
                                        { v: 'BN', l: uiLang === 'bn' ? 'বাংলা (ক, খ...)' : 'Bangla (ক, খ...)' },
                                        { v: 'EN', l: uiLang === 'bn' ? 'ইংরেজি (A, B...)' : 'English (A, B...)' }
                                    ]}
                                />
                            </FL>

                            {/* Shuffle Type */}
                            <FL label={uiLang === 'bn' ? 'শাফল করার নিয়ম' : 'Shuffle Configuration'}>
                                <Seg 
                                    value={s.shuffleType || 'QUESTIONS_AND_OPTIONS'} 
                                    onChange={v => u("shuffleType", v)} 
                                    opts={[
                                        { v: 'QUESTIONS_ONLY', l: uiLang === 'bn' ? 'শুধু প্রশ্ন' : 'Questions Only' },
                                        { v: 'QUESTIONS_AND_OPTIONS', l: uiLang === 'bn' ? 'প্রশ্ন ও অপশন' : 'Questions & Options' }
                                    ]}
                                />
                            </FL>

                            {/* Seed Salt Display */}
                            <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
                                <span>{uiLang === 'bn' ? 'ইউনিক সীড সল্ট' : 'Unique Seed Salt'}: <span className="font-mono text-indigo-600">{s.setCodeSeedSalt || 'N/A'}</span></span>
                                <button 
                                    type="button" 
                                    onClick={() => u("setCodeSeedSalt", Math.floor(Math.random() * 1000000) + 1)}
                                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-colors shadow-sm text-[10px]"
                                >
                                    {uiLang === 'bn' ? 'নতুন সীড দিন' : 'Regenerate'}
                                </button>
                            </div>

                            {/* Matrix Title */}
                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-3">
                                    {uiLang === 'bn' ? 'শাফল সিকোয়েন্স ম্যাট্রিক্স (OMR Mapping)' : 'Shuffle Sequence Matrix'}
                                </span>
                                
                                {(() => {
                                    const mcqs = (documentQuestions || []).filter(q => q.attrs?.type === 'MCQ');
                                    if (mcqs.length === 0) {
                                        return (
                                            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[11px] p-3 rounded-lg font-bold">
                                                {uiLang === 'bn' 
                                                    ? 'প্রশ্নপত্রে কোনো বহুনির্বাচনি (MCQ) প্রশ্ন পাওয়া যায়নি। ম্যাট্রিক্স দেখতে প্রথমে MCQ প্রশ্ন যোগ করুন।' 
                                                    : 'No MCQ questions found in the document. Please add MCQ questions first.'}
                                            </div>
                                        );
                                    }

                                    const count = s.setCount || 4;
                                    const lang = s.setLanguage || 'BN';
                                    const setNames = lang === 'EN' 
                                        ? (count === 2 ? ['A', 'B'] : ['A', 'B', 'C', 'D'])
                                        : (count === 2 ? ['ক', 'খ'] : ['ক', 'খ', 'গ', 'ঘ']);

                                    const mappings = s.setMappings || {};
                                    const masterSet = setNames[0];

                                    return (
                                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-inner max-h-[400px] custom-scrollbar">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
                                                        <th className="p-2 border-r border-slate-200 text-center">{uiLang === 'bn' ? `মূল (${masterSet})` : `Master (${masterSet})`}</th>
                                                        {setNames.slice(1).map(setName => (
                                                            <th key={setName} className="p-2 border-r border-slate-200 text-center">{uiLang === 'bn' ? `সেট ${setName}` : `Set ${setName}`}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {mcqs.map((q, idx) => {
                                                        const qId = q.attrs?.questionId || `temp-q-${idx}`;
                                                        const qNumText = `${idx + 1}`;
                                                        
                                                        return (
                                                            <tr key={qId} className="border-b border-slate-100 hover:bg-slate-50/50 text-[11px] font-semibold text-slate-700">
                                                                <td className="p-2 border-r border-slate-200 text-center bg-indigo-50/30 text-indigo-700 font-bold">{qNumText}</td>
                                                                {setNames.slice(1).map(setName => {
                                                                    const setQList = mappings[setName]?.questions || [];
                                                                    const shuffledIndex = setQList.indexOf(qId);
                                                                    const shuffledNum = shuffledIndex !== -1 ? shuffledIndex + 1 : '—';
                                                                    
                                                                    return (
                                                                        <td key={setName} className="p-2 border-r border-slate-200 text-center font-mono font-bold">
                                                                            {shuffledNum}
                                                                        </td>
                                                                    );
                                                                })}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>}
        </div>
    );
}
