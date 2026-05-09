import React from 'react';
import { SUBJECTS, CLASSES, EXAMS, GROUPS, BOARDS, BN_FONTS, EN_FONTS, PAGE_SIZES, HEADER_STYLES, SECTION_STYLES, WATERMARK_OPT } from './DocumentSettings';
import { Toggle, FL, G2, Num, Sel, Inp, Slide, ST, Seg, FieldDisplay, NumDisplay, CollapsibleBox, TypographyToolbar } from './SettingsComponents';
import { UI_TEXT } from './translations';
import { Lock, Unlock, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

export default function SettingsPanel({ s, u, uMulti, activeTab, uiLang }) {
    const t = UI_TEXT[uiLang];
    const [isEditMode, setIsEditMode] = React.useState(true);

    return (
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-white">
            {activeTab === "questionSetup" && <>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.sections || 'Sections'}</span>
                    <button 
                        onClick={() => {
                            const newSec = { id: 'sec-'+Date.now(), name: "নতুন বিভাগ", instructions: "", conditions: "", numberingStyle: "bn", marksConfig: "hide", optionLayout: "col1", isMCQ: false };
                            u("sections", [...(s.sections || []), newSec]);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-md text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                    >
                        + {t.addSection || 'Add Section'}
                    </button>
                </div>

                <div className="space-y-4">
                    {(s.sections || []).map((sec, idx) => (
                        <div key={sec.id} className="bg-slate-50 rounded-xl border border-slate-200 p-3 shadow-sm relative group">
                            <button 
                                onClick={() => {
                                    if(window.confirm('Are you sure?')) {
                                        const ns = [...s.sections]; ns.splice(idx,1); u("sections", ns);
                                    }
                                }}
                                className="absolute top-2 right-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                ×
                            </button>
                            
                            <div className="space-y-3 mt-1">
                                {/* Text Content Collapsibles */}
                                <CollapsibleBox 
                                    title={t.sectionName || 'Section Name'} 
                                    defaultOpen={true}
                                    toggleKey="showName"
                                    toggleVal={sec.showName !== false}
                                    onToggle={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }}
                                >
                                    <Inp 
                                        value={sec.name} 
                                        disabled={sec.showName === false}
                                        onChange={v => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], name: v }; u("sections", ns); }} 
                                    />
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
                                </CollapsibleBox>
                                
                                <CollapsibleBox 
                                    title={t.conditions || 'Conditions'} 
                                    defaultOpen={false}
                                    toggleKey="showConditions"
                                    toggleVal={sec.showConditions !== false}
                                    onToggle={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }}
                                >
                                    <Inp 
                                        value={sec.conditions || ''} 
                                        disabled={sec.showConditions === false}
                                        onChange={v => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], conditions: v }; u("sections", ns); }} 
                                    />
                                    {sec.showConditions !== false && (
                                        <TypographyToolbar 
                                            state={sec} 
                                            prefix="cond" 
                                            onChange={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }} 
                                        />
                                    )}
                                </CollapsibleBox>
                                
                                <CollapsibleBox 
                                    title={t.instructions || 'Instructions'} 
                                    defaultOpen={false}
                                    toggleKey="showInstructions"
                                    toggleVal={sec.showInstructions !== false}
                                    onToggle={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }}
                                >
                                    <textarea 
                                        className="w-full text-[13px] p-2 border border-slate-200 rounded-md outline-none focus:border-indigo-400 min-h-[50px] resize-y disabled:opacity-50"
                                        value={sec.instructions || ''}
                                        disabled={sec.showInstructions === false}
                                        onChange={e => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], instructions: e.target.value }; u("sections", ns); }}
                                    />
                                    {sec.showInstructions !== false && (
                                        <TypographyToolbar 
                                            state={sec} 
                                            prefix="inst" 
                                            onChange={(k, v) => { const ns = [...s.sections]; ns[idx] = { ...ns[idx], [k]: v }; u("sections", ns); }} 
                                        />
                                    )}
                                </CollapsibleBox>
                                
                                {/* Section Layout & Style */}
                                <CollapsibleBox 
                                    title={uiLang === 'bn' ? 'লেআউট এবং স্টাইল (Layout & Style)' : 'Layout & Styling'} 
                                    defaultOpen={false}
                                >
                                    <div className="mb-3">
                                        <div className="grid grid-cols-2 gap-2 mb-2">
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
                                        <div className="grid grid-cols-2 gap-2 mb-2">
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
                                                        <span className="text-[10px] text-slate-500 font-bold group-hover:text-indigo-600 transition-colors select-none">
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

                                    <div className="mt-2 pt-3 border-t border-slate-100">
                                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{uiLang === 'bn' ? 'কলাম ও স্পেসিং' : 'Columns & Spacing'}</div>
                                        
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            <FL label={uiLang === 'bn' ? 'কলাম' : 'Columns'}>
                                                <Sel value={sec.columns || 1} onChange={v => {
                                                    const ns = [...s.sections]; ns[idx] = { ...ns[idx], columns: Number(v) }; u("sections", ns);
                                                }} opts={[
                                                    {v: 1, l: uiLang === 'bn' ? '১ কলাম' : '1 Column'},
                                                    {v: 2, l: uiLang === 'bn' ? '২ কলাম' : '2 Columns'},
                                                    {v: 3, l: uiLang === 'bn' ? '৩ কলাম' : '3 Columns'}
                                                ]} />
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
                                                <input 
                                                    type="number" 
                                                    value={sec.colGap !== undefined ? sec.colGap : (s.colGap || 10)} 
                                                    onChange={e => {
                                                        const ns = [...s.sections]; ns[idx] = { ...ns[idx], colGap: e.target.value }; u("sections", ns);
                                                    }}
                                                    className="w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 text-center font-mono"
                                                />
                                            </FL>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <FL label={uiLang === 'bn' ? 'ফন্ট সাইজ (pt)' : 'Font Size (pt)'}>
                                                <input 
                                                    type="number" 
                                                    value={sec.fontSize !== undefined ? sec.fontSize : (s.bodyFontSize || 14)} 
                                                    onChange={e => {
                                                        const ns = [...s.sections]; ns[idx] = { ...ns[idx], fontSize: e.target.value }; u("sections", ns);
                                                    }}
                                                    className="w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 text-center font-mono"
                                                />
                                            </FL>
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

                                        <div className="grid grid-cols-3 gap-2 mt-2">
                                            <FL label={uiLang === 'bn' ? 'লাইন গ্যাপ' : 'Line Gap'}>
                                                <input 
                                                    type="number" step="0.1" min="0.1" max="5.0"
                                                    value={sec.lineGap !== undefined ? sec.lineGap : (s.lineHeight || 1.5)} 
                                                    onChange={e => {
                                                        const ns = [...s.sections]; ns[idx] = { ...ns[idx], lineGap: e.target.value }; u("sections", ns);
                                                    }}
                                                    className="w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 text-center font-mono"
                                                />
                                            </FL>
                                            <FL label={uiLang === 'bn' ? 'অপশন (px)' : 'Option (px)'}>
                                                <input 
                                                    type="number" min="-50" max="100"
                                                    value={sec.optionGap !== undefined ? sec.optionGap : 8} 
                                                    onChange={e => {
                                                        const ns = [...s.sections]; ns[idx] = { ...ns[idx], optionGap: e.target.value }; u("sections", ns);
                                                    }}
                                                    className="w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 text-center font-mono"
                                                />
                                            </FL>
                                            <FL label={uiLang === 'bn' ? 'প্রশ্ন (px)' : 'Question (px)'}>
                                                <input 
                                                    type="number" min="-100" max="150"
                                                    value={sec.questionGap !== undefined ? sec.questionGap : (s.questionGap || 15)} 
                                                    onChange={e => {
                                                        const ns = [...s.sections]; ns[idx] = { ...ns[idx], questionGap: e.target.value }; u("sections", ns);
                                                    }}
                                                    className="w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 text-center font-mono"
                                                />
                                            </FL>
                                        </div>
                                    </div>
                                </CollapsibleBox>
                            </div>
                        </div>
                    ))}
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
                    <Seg value={s.columns} onChange={v=>u("columns",v)} opts={[{v:1,l:t.oneCol || '1'},{v:2,l:t.twoCol || '2'}]}/>
                    </FL>
                    {s.columns>1 && <FL label={t.colGap || 'Column Gap'}><Slide value={s.colGap} onChange={v=>u("colGap",v)} min={5} max={30}/></FL>}
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
                {[{n:t.narrow,t:12,b:12,l:15,r:15},{n:t.normal,t:20,b:20,l:25,r:20},{n:t.wide,t:25,b:25,l:30,r:30}].map(p=>(
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
                </div>
            </div>}
        </div>
    );
}
