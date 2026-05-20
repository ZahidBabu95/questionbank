import React, { useState } from 'react';
import { 
    Settings2, PanelRightClose, ImageIcon, 
    AlignLeft, AlignCenter, AlignRight, Globe, Loader2, Crop
} from 'lucide-react';
import SettingsPanel from '../SettingsPanel';
import { useNexusEditor } from '../../context/NexusEditorContext';
import { useExamManager } from '../../hooks/useExamManager';
import { DEFAULT_SETTINGS } from '../DocumentSettings';
import ImageEditorModal from '../../../../../../components/ImageEditorModal';
import questionService from '../../../../../../services/questionService';

const RightSidebar = ({ isDraggingRight, setIsDraggingRight }) => {
    const { 
        uiLang, t, 
        isRightPanelOpen, setIsRightPanelOpen,
        rightPanelWidth, 
        activeTab, 
        docSettings, updateSetting, updateMultiSettings, setDocSettings,
        selectedImageConfig, setSelectedImageConfig,
        workspaceTools, setWorkspaceTools
    } = useNexusEditor();

    const { 
        templates, loadingTemplates, applyTemplate, 
        savedSubjectsList, saveSubjectDefaults, loadSubjectDefaults, deleteSubjectDefault 
    } = useExamManager();

    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [isCroppingImageUpload, setIsCroppingImageUpload] = useState(false);

    const handleCropSave = async (file, blobUrl) => {
        setIsCroppingImageUpload(true);
        try {
            const res = await questionService.uploadStimulusImage(file);
            const url = res.url;
            
            // Dispatch update to sync new URL and keep the current width/align
            if (selectedImageConfig && selectedImageConfig.onUpdate) {
                selectedImageConfig.onUpdate(selectedImageConfig.align, selectedImageConfig.width, url);
                setSelectedImageConfig(prev => ({ ...prev, src: url }));
            }
        } catch (err) {
            alert('Image upload failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsCroppingImageUpload(false);
            setIsCropperOpen(false);
        }
    };

    return (
        <div style={{ width: isRightPanelOpen ? `${rightPanelWidth}px` : '0px' }}
             className={`${!isDraggingRight ? 'transition-all duration-300 ease-in-out' : ''} border-l border-slate-200 shrink-0 flex flex-col z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] relative print:hidden`}>
            
            {/* Resize Handle */}
            <div onMouseDown={() => setIsDraggingRight(true)}
                 className={`absolute top-0 left-[-3px] w-[6px] h-full cursor-col-resize z-40 transition-colors hover:bg-indigo-400 ${isDraggingRight ? 'bg-indigo-500' : 'bg-transparent'}`} />

            <div className={`absolute top-0 right-0 h-full flex flex-col bg-white ${!isRightPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${!isDraggingRight ? 'transition-opacity duration-300' : ''}`} style={{ width: `${rightPanelWidth}px` }}>
                <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Settings2 size={16} className="text-indigo-500"/> {t[activeTab]}
                    </h2>
                    <button onClick={() => setIsRightPanelOpen(false)} className="text-slate-400 hover:text-slate-700 rounded p-1 hover:bg-slate-200 transition-colors">
                        <PanelRightClose size={14}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab !== 'templates' && activeTab !== 'imageProps' && (
                        <SettingsPanel s={docSettings} u={updateSetting} uMulti={updateMultiSettings} activeTab={activeTab} uiLang={uiLang} />
                    )}

                    {activeTab === 'imageProps' && selectedImageConfig && (
                        <div className="p-4 space-y-6">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                                <h3 className="text-[13px] font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                    <ImageIcon size={14} /> Image Properties
                                </h3>
                                <p className="text-[11px] text-indigo-600/80 leading-relaxed font-medium">
                                    Adjust the dimensions and alignment of the selected image. Changes will apply immediately.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Width (Size)</label>
                                <div className="flex flex-col gap-2">
                                    <input 
                                        type="text" 
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium rounded-md px-3 py-2 outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                                        value={selectedImageConfig.width}
                                        onChange={(e) => setSelectedImageConfig({...selectedImageConfig, width: e.target.value})}
                                        onBlur={(e) => selectedImageConfig.onUpdate(selectedImageConfig.align, e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') selectedImageConfig.onUpdate(selectedImageConfig.align, e.target.value);
                                        }}
                                    />
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                        {['auto', '30%', '50%', '75%', '100%'].map(w => (
                                            <button key={w} onClick={() => {
                                                    setSelectedImageConfig({...selectedImageConfig, width: w});
                                                    selectedImageConfig.onUpdate(selectedImageConfig.align, w);
                                                }}
                                                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${selectedImageConfig.width === w ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                            >
                                                {w.replace('%', ' %')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Crop / Edit Button */}
                            <div>
                                <button 
                                    onClick={() => setIsCropperOpen(true)}
                                    disabled={isCroppingImageUpload}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                                >
                                    {isCroppingImageUpload ? (
                                        <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                                    ) : (
                                        <><Crop size={16} /> Crop / Edit Image</>
                                    )}
                                </button>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Alignment</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    {['left', 'center', 'right'].map(align => (
                                        <button key={align} onClick={() => {
                                                setSelectedImageConfig({...selectedImageConfig, align});
                                                selectedImageConfig.onUpdate(align, selectedImageConfig.width);
                                            }}
                                            className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${selectedImageConfig.align === align ? 'bg-white shadow-sm text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {align === 'left' ? <AlignLeft size={16}/> : align === 'center' ? <AlignCenter size={16}/> : <AlignRight size={16}/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Image Editor Modal */}
                    <ImageEditorModal 
                        isOpen={isCropperOpen}
                        src={selectedImageConfig?.src}
                        onClose={() => setIsCropperOpen(false)}
                        onSave={handleCropSave}
                    />

                    {activeTab === 'templates' && (
                        <div className="p-4 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <Settings2 size={14} className="text-indigo-500" /> {t.wsTools}
                                </h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={workspaceTools.math} onChange={e => setWorkspaceTools(prev => ({ ...prev, math: e.target.checked }))} className="w-4 h-4 rounded text-indigo-500 border-slate-300 focus:ring-indigo-500" />
                                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">{t.mathEd}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={workspaceTools.table} onChange={e => setWorkspaceTools(prev => ({ ...prev, table: e.target.checked }))} className="w-4 h-4 rounded text-indigo-500 border-slate-300 focus:ring-indigo-500" />
                                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">{t.tableBld}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input type="checkbox" checked={workspaceTools.image} onChange={e => setWorkspaceTools(prev => ({ ...prev, image: e.target.checked }))} className="w-4 h-4 rounded text-indigo-500 border-slate-300 focus:ring-indigo-500" />
                                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800">{t.imgUp}</span>
                                    </label>
                                </div>
                            </div>

                            {/* Subject-Specific Default Layout Setup */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Settings2 size={14} className="text-indigo-500" />
                                    {uiLang === 'bn' ? 'বিষয় ভিত্তিক ডিফল্ট সেটআপ' : 'Subject Default Layout'}
                                </h3>
                                <p className="text-[11px] text-slate-500 leading-normal mb-3 font-medium">
                                    {uiLang === 'bn' 
                                        ? 'বর্তমান এডিটর ফাইলের লেআউটটি নির্দিষ্ট বিষয়ের ডিফল্ট হিসেবে সেট করুন।' 
                                        : 'Save or apply layout defaults for the current subject.'}
                                </p>
                                
                                <div className="p-2.5 bg-white border border-slate-200 rounded-lg mb-3">
                                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        {uiLang === 'bn' ? 'বর্তমান বিষয়' : 'Current Subject'}
                                    </div>
                                    <div className="text-sm font-bold text-indigo-600">
                                        {docSettings.subject || (uiLang === 'bn' ? 'কোনো বিষয় নেই' : 'No Subject Set')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button 
                                        onClick={() => saveSubjectDefaults(docSettings.subject, docSettings)}
                                        className="py-2 px-3 text-center bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                    >
                                        {uiLang === 'bn' ? 'ডিফল্ট সেভ করুন' : 'Save Default'}
                                    </button>
                                    <button 
                                        onClick={() => loadSubjectDefaults(docSettings.subject)}
                                        className="py-2 px-3 text-center bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        {uiLang === 'bn' ? 'ডিফল্ট লোড করুন' : 'Load Default'}
                                    </button>
                                </div>

                                {savedSubjectsList && savedSubjectsList.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            {uiLang === 'bn' ? 'সংরক্ষিত বিষয়ের তালিকা' : 'Saved Subjects'}
                                        </div>
                                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                            {savedSubjectsList.map(subName => (
                                                <div key={subName} className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-100 rounded-md text-xs">
                                                    <span className="font-semibold text-slate-600 capitalize">{subName}</span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => loadSubjectDefaults(subName)}
                                                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                                                        >
                                                            {uiLang === 'bn' ? 'অ্যাপ্লাই' : 'Apply'}
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteSubjectDefault(subName)}
                                                            className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                                                        >
                                                            {uiLang === 'bn' ? 'মুছুন' : 'Delete'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <Globe size={14} className="text-blue-500" /> {t.availTemplates}
                                </h3>
                                {loadingTemplates ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                        <Loader2 className="animate-spin mb-2" size={24} />
                                        <span className="text-xs font-medium uppercase tracking-widest">{t.loading}</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <button onClick={() => {
                                            alert(uiLang === 'bn' ? "ডিফল্ট সেটিংস অ্যাপ্লাই করা হয়েছে।" : "Default settings applied.");
                                            const defaultSettings = { ...DEFAULT_SETTINGS, templateId: 'default' };
                                            setDocSettings(defaultSettings);
                                        }} className={`w-full flex flex-col text-left px-3 py-2.5 bg-white border rounded-lg transition-all group ${docSettings?.templateId === 'default' ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'}`}>
                                            <span className={`text-sm font-bold transition-colors ${docSettings?.templateId === 'default' ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>{uiLang === 'bn' ? 'ডিফল্ট সেটিংস' : 'Default Settings'}</span>
                                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">{uiLang === 'bn' ? 'সিস্টেম ডিফল্ট' : 'System Default'}</span>
                                        </button>

                                        {templates.length > 0 && templates.map(tpl => (
                                            <button key={tpl.id} onClick={() => {
                                                applyTemplate(tpl);
                                            }} className={`w-full flex flex-col text-left px-3 py-2.5 bg-white border rounded-lg transition-all group ${docSettings?.templateId === tpl.id ? 'border-indigo-500 shadow-sm ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'}`}>
                                                <span className={`text-sm font-bold transition-colors ${docSettings?.templateId === tpl.id ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>{tpl.templateName}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">{tpl.global ? t.globalTpl : t.instTpl}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;
