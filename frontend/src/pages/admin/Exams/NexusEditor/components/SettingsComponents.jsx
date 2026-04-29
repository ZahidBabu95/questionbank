import React from 'react';

export const Toggle = ({checked,onChange}) => (
  <label style={{position:"relative",width:40,height:22,cursor:"pointer",display:"inline-block",flexShrink:0}}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{opacity:0,width:0,height:0,position:"absolute"}}/>
    <span style={{position:"absolute",inset:0,borderRadius:22,background:checked?"#4f46e5":"#cbd5e1",transition:"0.2s"}}/>
    <span style={{position:"absolute",width:18,height:18,borderRadius:"50%",background:"white",top:2,left:checked?20:2,transition:"0.2s"}}/>
  </label>
);

export const FL = ({label, help, children, toggleKey, toggleVal, onToggle}) => (
  <div style={{marginBottom:11}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
      <div style={{display:"flex", alignItems:"center", gap: 6}}>
        <span style={{fontSize:12,color:"#475569",fontWeight:600}}>{label}</span>
        {toggleKey && (
          <label style={{position:"relative",width:24,height:14,cursor:"pointer",display:"inline-block",flexShrink:0}}>
            <input type="checkbox" checked={toggleVal} onChange={e=>onToggle(toggleKey, e.target.checked)} style={{opacity:0,width:0,height:0,position:"absolute"}}/>
            <span style={{position:"absolute",inset:0,borderRadius:14,background:toggleVal?"#4f46e5":"#cbd5e1",transition:"0.2s"}}/>
            <span style={{position:"absolute",width:10,height:10,borderRadius:"50%",background:"white",top:2,left:toggleVal?12:2,transition:"0.2s"}}/>
          </label>
        )}
      </div>
      {help&&<span style={{fontSize:11,color:"#64748b"}}>{help}</span>}
    </div>
    {children}
  </div>
);

export const G2 = ({children}) => <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{children}</div>;

export const Num = ({value,onChange,min=0,max=999,step=1}) => (
  <input type="number" value={value} onChange={e=>onChange(+e.target.value)} min={min} max={max} step={step}
    className="w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 text-center font-mono" />
);

export const Sel = ({value,onChange,opts}) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    className="w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400">
    {opts.map(o=><option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
  </select>
);

export const Inp = ({value,onChange,placeholder=""}) => (
  <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    className="w-full text-[13px] px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400" />
);

export const Slide = ({value,onChange,min,max,step=1}) => {
  const [localVal, setLocalVal] = useState(value);
  
  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (localVal !== value) onChange(localVal);
    }, 50);
    return () => clearTimeout(t);
  }, [localVal]);

  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <input type="range" min={min} max={max} step={step} value={localVal} 
        onChange={e=>setLocalVal(+e.target.value)} 
        style={{flex:1}} className="accent-indigo-500" />
      <span style={{fontSize:12,minWidth:28,textAlign:"right",color:"#64748b",fontWeight:600}}>{localVal}</span>
    </div>
  );
};

export const ST = ({children}) => (
  <div style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.05em",margin:"16px 0 9px",paddingBottom:5,borderBottom:"1px solid #e2e8f0"}}>{children}</div>
);

export const Seg = ({opts,value,onChange}) => (
  <div style={{display:"flex"}}>
    {opts.map((o,i)=>(
      <button key={o.v} onClick={()=>onChange(o.v)}
        style={{flex:1,padding:"5px 0",fontSize:12,cursor:"pointer",border:"1px solid #e2e8f0",background:value===o.v?"#4f46e5":"white",color:value===o.v?"white":"#475569",transition:"all 0.12s",fontWeight:value===o.v?600:500,
          borderRadius:i===0?"6px 0 0 6px":i===opts.length-1?"0 6px 6px 0":"0"}}>
        {o.l}
      </button>
    ))}
  </div>
);

export const FieldDisplay = ({ isEdit, value, onChange, placeholder="", disabled=false }) => {
  if (isEdit) {
    return <input type="text" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={`w-full text-[13px] px-2.5 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`} />;
  }
  return <div className={`w-full text-[13px] px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-md text-slate-700 font-medium truncate ${disabled ? 'opacity-40 line-through' : ''}`} title={value || 'N/A'}>{value || 'N/A'}</div>;
};

export const NumDisplay = ({ isEdit, value, onChange, min=0, max=999, disabled=false }) => {
  if (isEdit) {
    return <input type="number" value={value} onChange={e=>onChange(+e.target.value)} min={min} max={max} disabled={disabled} className={`w-full text-[13px] px-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-800 outline-none focus:border-indigo-400 text-center font-mono ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`} />;
  }
  return <div className={`w-full text-[13px] px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-md text-slate-700 font-mono text-center ${disabled ? 'opacity-40 line-through' : ''}`}>{value || 0}</div>;
};

import { useState, useEffect } from 'react';

export const CollapsibleBox = ({ title, children, defaultOpen = false, toggleKey, toggleVal, onToggle }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <details 
            className="group border border-slate-200 rounded-md bg-white shadow-sm mb-3" 
            open={isOpen}
            onToggle={(e) => setIsOpen(e.target.open)}
        >
            <summary className="flex items-center justify-between p-2.5 bg-slate-50/80 cursor-pointer select-none border-b border-transparent group-open:border-slate-100 transition-colors list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 text-[13px]">{title}</span>
                    {toggleKey && (
                        <div onClick={e => e.preventDefault()}>
                            <Toggle checked={toggleVal} onChange={e => onToggle(toggleKey, e.target.checked)} />
                        </div>
                    )}
                </div>
                <svg className="w-4 h-4 text-slate-400 transform group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </summary>
            <div className="p-3">
                {children}
            </div>
        </details>
    );
};

import { Bold, Italic, Underline as UnderlineIcon, Type, AlignCenter } from 'lucide-react';

export const TypographyToolbar = ({ state, onChange, prefix }) => {
    return (
        <div className="mt-2 bg-slate-50/50 border border-slate-200 rounded-md p-2">
            <div className="flex items-center gap-1.5 mb-2">
                <button 
                    title="Bold"
                    onClick={() => onChange(`${prefix}Bold`, !state[`${prefix}Bold`])}
                    className={`p-1.5 rounded transition-colors ${state[`${prefix}Bold`] !== false && state[`${prefix}Bold`] ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    <Bold size={14} />
                </button>
                <button 
                    title="Italic"
                    onClick={() => onChange(`${prefix}Italic`, !state[`${prefix}Italic`])}
                    className={`p-1.5 rounded transition-colors ${state[`${prefix}Italic`] ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    <Italic size={14} />
                </button>
                <button 
                    title="Underline"
                    onClick={() => onChange(`${prefix}Underline`, !state[`${prefix}Underline`])}
                    className={`p-1.5 rounded transition-colors ${state[`${prefix}Underline`] ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                >
                    <UnderlineIcon size={14} />
                </button>
                
                <div className="w-px h-5 bg-slate-300 mx-1"></div>
                
                <div className="flex items-center gap-1.5 text-slate-600" title="Font Size (px)">
                    <Type size={13} />
                    <input 
                        type="number" min="8" max="48" 
                        value={state[`${prefix}FontSize`] || ''} placeholder="Auto"
                        onChange={e => onChange(`${prefix}FontSize`, parseInt(e.target.value) || '')}
                        className="w-14 text-xs border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-indigo-400 text-center"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-700 border-t border-slate-200 pt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={state[`${prefix}Bg`] || false} onChange={e => onChange(`${prefix}Bg`, e.target.checked)} className="accent-indigo-600" />
                    Background Box
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={state[`${prefix}Divider`] || false} onChange={e => onChange(`${prefix}Divider`, e.target.checked)} className="accent-indigo-600" />
                    Bottom Divider
                </label>
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-slate-500">Gap:</span>
                    <input 
                        type="number" 
                        value={state[`${prefix}Gap`] || ''} placeholder="px"
                        onChange={e => onChange(`${prefix}Gap`, parseInt(e.target.value) || '')}
                        className="w-12 border border-slate-200 rounded px-1 py-0.5 outline-none focus:border-indigo-400 text-center"
                    />
                </div>
            </div>
        </div>
    );
};
