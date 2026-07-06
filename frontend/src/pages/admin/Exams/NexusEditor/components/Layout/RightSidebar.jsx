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

const getNumericWidth = (widthStr) => {
    if (!widthStr || widthStr === 'auto') return 100;
    const match = String(widthStr).match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 100;
};

const ImageSizeInput = ({ value, onChange, className }) => {
    const [localVal, setLocalVal] = useState(value);

    React.useEffect(() => {
        setLocalVal(value);
    }, [value]);

    const handleCommit = () => {
        let val = String(localVal).trim();
        if (!val) {
            val = 'auto';
        } else if (/^\d+$/.test(val)) {
            val = `${val}%`;
        }
        onChange(val);
    };

    return (
        <input
            type="text"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleCommit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    handleCommit();
                    e.currentTarget.blur();
                }
            }}
            placeholder="e.g. 50%"
            className={className || "w-full text-center bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-md py-1 px-1.5 outline-none focus:border-indigo-400 focus:bg-white transition-colors"}
        />
    );
};

const ImageSizeSlider = ({ value, onChange, containerClass, labelClass }) => {
    const numericVal = getNumericWidth(value);
    const [localVal, setLocalVal] = useState(numericVal);

    React.useEffect(() => {
        setLocalVal(numericVal);
    }, [numericVal]);

    const handleCommit = (val) => {
        onChange(`${val}%`);
    };

    return (
        <div className={containerClass || "flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-lg border border-slate-100 w-full"}>
            <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={localVal}
                onChange={(e) => setLocalVal(parseInt(e.target.value, 10))}
                onMouseUp={() => handleCommit(localVal)}
                onTouchEnd={() => handleCommit(localVal)}
                onKeyUp={(e) => {
                    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
                        handleCommit(localVal);
                    }
                }}
                className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
            />
            <span className={labelClass || "text-[10px] text-indigo-600 font-bold min-w-[28px] text-right"}>
                {(value === 'auto' || !value) && localVal === 100 ? 'Auto' : `${localVal}%`}
            </span>
        </div>
    );
};

const getAllImages = (documentQuestions, editor, uiLang) => {
    const images = [];
    if (!editor) return images;

    // 1. Scan for standalone images
    try {
        editor.state.doc.descendants((node, pos) => {
            if (node.type.name === 'image') {
                images.push({
                    type: 'standalone',
                    pos,
                    nodeSize: node.nodeSize,
                    node,
                    src: node.attrs.src,
                    alt: node.attrs.alt || '',
                    width: node.attrs.width || '50%',
                    align: node.attrs.align || 'center',
                    label: uiLang === 'bn' ? 'ক্যানভাস ইমেজ' : 'Canvas Image',
                    context: 'standalone',
                    index: 0
                });
            }
        });
    } catch (e) {
        console.error("Error scanning standalone images:", e);
    }

    // 2. Scan for images inside question blocks
    if (documentQuestions && documentQuestions.length > 0) {
        documentQuestions.forEach((q) => {
            const attrs = q.attrs;
            const qNum = attrs.questionNumber || '';
            const qLabel = qNum 
                ? (uiLang === 'bn' ? `প্রশ্ন ${qNum}` : `Question ${qNum}`)
                : (uiLang === 'bn' ? `প্রশ্ন` : `Question`);

            const extractFromText = (text, contextId, detailLabel) => {
                if (!text) return;
                const regex = /!\[([^\]]*)\]\(([^)]+)\)/g;
                let match;
                let localImgCount = 0;
                while ((match = regex.exec(text)) !== null) {
                    const rawAlt = match[1] || '';
                    const url = match[2] || '';
                    
                    let parts = rawAlt.split('|');
                    let alt = parts[0] || '';
                    let align = parts[1] || 'center';
                    let width = parts[2] || 'auto';

                    images.push({
                        type: 'questionBlock',
                        pos: q.pos,
                        nodeSize: q.nodeSize,
                        attrs: q.attrs,
                        src: url,
                        alt: alt,
                        width: width,
                        align: align,
                        label: `${qLabel} - ${detailLabel}`,
                        context: contextId,
                        index: localImgCount
                    });
                    
                    localImgCount++;
                }
            };

            // Stimulus
            if (attrs.stimulus) {
                extractFromText(attrs.stimulus, 'stimulus', uiLang === 'bn' ? 'উদ্দীপক' : 'Stimulus');
            }
            // Question Text
            if (attrs.questionText) {
                extractFromText(attrs.questionText, 'questionText', uiLang === 'bn' ? 'মূল প্রশ্ন' : 'Question Text');
            }
            // Statements
            if (attrs.statements && Array.isArray(attrs.statements)) {
                attrs.statements.forEach((stmt, idx) => {
                    const stmtLabel = uiLang === 'bn' ? `বিবৃতি ${idx + 1}` : `Statement ${idx + 1}`;
                    extractFromText(stmt, `stmt-${idx}`, stmtLabel);
                });
            }
            // Options
            if (attrs.options && Array.isArray(attrs.options)) {
                attrs.options.forEach((opt, idx) => {
                    const optLabel = uiLang === 'bn' ? `অপশন ${idx + 1}` : `Option ${idx + 1}`;
                    extractFromText(opt.optionText || opt.text || '', `opt-${idx}`, optLabel);
                });
            }
        });
    }

    return images;
};

const RightSidebar = ({ isDraggingRight, setIsDraggingRight }) => {
    const {
        uiLang, t, isMobileApp,
        isRightPanelOpen, setIsRightPanelOpen,
        rightPanelWidth, 
        activeTab, 
        docSettings, updateSetting, updateMultiSettings, setDocSettings,
        selectedImageConfig, setSelectedImageConfig,
        workspaceTools, setWorkspaceTools,
        addToast,
        editor, documentQuestions
    } = useNexusEditor();

    React.useEffect(() => {
        document.documentElement.style.setProperty('--right-panel-width', `${rightPanelWidth}px`);
    }, [rightPanelWidth]);

    const { 
        examData, templates, loadingTemplates, applyTemplate, 
        savedSubjectsList, savedClassSubjectsList, saveSubjectDefaults, loadSubjectDefaults, deleteSubjectDefault,
        getNormalizedSubjectKey, getNormalizedClassKey
    } = useExamManager();

    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [isCroppingImageUpload, setIsCroppingImageUpload] = useState(false);
    const [croppingImage, setCroppingImage] = useState(null);

    const updateStandaloneImage = (pos, node, align, width, src) => {
        if (!editor) return;
        try {
            const tr = editor.state.tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                align,
                width,
                src: src || node.attrs.src
            });
            editor.view.dispatch(tr);
        } catch (err) {
            console.error("Failed to update standalone image:", err);
        }
    };

    const updateQuestionBlockImage = (pos, qAttrs, contextId, imgIndex, align, width, src) => {
        if (!editor) return;
        
        const alt = qAttrs.alt || 'চিত্র';
        const finalUrl = src;
        const newRawAlt = `${alt}|${align}|${width}`;
        const newMarkdown = `![${newRawAlt}](${finalUrl})`;

        const replaceNthImage = (text) => {
            if (!text) return { replaced: false, text };
            let count = 0;
            let replaced = false;
            
            const newText = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, matchAlt, matchUrl) => {
                if (count === imgIndex) {
                    replaced = true;
                    count++;
                    return newMarkdown;
                }
                count++;
                return match;
            });
            return { replaced, text: newText };
        };

        let updatedAttrs = { ...qAttrs };
        let replaced = false;

        if (contextId === 'stimulus') {
            const res = replaceNthImage(qAttrs.stimulus);
            if (res.replaced) {
                updatedAttrs.stimulus = res.text;
                replaced = true;
            }
        } 
        else if (contextId === 'questionText') {
            const res = replaceNthImage(qAttrs.questionText);
            if (res.replaced) {
                updatedAttrs.questionText = res.text;
                replaced = true;
            }
        }
        else if (contextId && contextId.startsWith('stmt-')) {
            const idx = parseInt(contextId.split('-')[1]);
            if (qAttrs.statements && qAttrs.statements[idx] !== undefined) {
                const newStmts = [...qAttrs.statements];
                const res = replaceNthImage(newStmts[idx]);
                if (res.replaced) {
                    newStmts[idx] = res.text;
                    updatedAttrs.statements = newStmts;
                    replaced = true;
                }
            }
        }
        else if (contextId && contextId.startsWith('opt-')) {
            const idx = parseInt(contextId.split('-')[1]);
            if (qAttrs.options && qAttrs.options[idx]) {
                const newOpts = [...qAttrs.options];
                const optText = newOpts[idx].optionText || newOpts[idx].text || '';
                const res = replaceNthImage(optText);
                if (res.replaced) {
                    newOpts[idx] = { ...newOpts[idx], optionText: res.text };
                    updatedAttrs.options = newOpts;
                    replaced = true;
                }
            }
        }

        if (replaced) {
            try {
                const node = editor.state.doc.nodeAt(pos);
                if (node && node.type.name === 'questionBlock' && node.attrs.questionId === qAttrs.questionId) {
                    const tr = editor.state.tr.setNodeMarkup(pos, null, updatedAttrs);
                    editor.view.dispatch(tr);
                } else {
                    let foundPos = null;
                    editor.state.doc.descendants((n, p) => {
                        if (n.type.name === 'questionBlock' && n.attrs.questionId === qAttrs.questionId) {
                            foundPos = p;
                            return false;
                        }
                    });
                    if (foundPos !== null) {
                        const tr = editor.state.tr.setNodeMarkup(foundPos, null, updatedAttrs);
                        editor.view.dispatch(tr);
                    }
                }
            } catch (err) {
                console.error("Failed to update question block image:", err);
            }
        }
    };

    const handleImageClick = (img) => {
        if (!editor) return;

        let targetPos = img.pos;
        if (img.type === 'questionBlock') {
            let foundPos = null;
            editor.state.doc.descendants((n, p) => {
                if (n.type.name === 'questionBlock' && n.attrs.questionId === img.attrs.questionId) {
                    foundPos = p;
                    return false;
                }
            });
            if (foundPos !== null) {
                targetPos = foundPos;
            }
        }

        if (img.type === 'questionBlock') {
            const imgId = `${img.src}-${img.index}`;
            const imgDom = document.getElementById(`img-${imgId}`);
            if (imgDom) {
                imgDom.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const parentBlock = imgDom.closest('[data-type="question-block"]');
                if (parentBlock) {
                    parentBlock.classList.add('nexus-highlight-flash');
                    setTimeout(() => {
                        parentBlock.classList.remove('nexus-highlight-flash');
                    }, 1500);
                }
                return;
            }
        }

        try {
            const domElement = editor.view.nodeDOM(targetPos);
            if (domElement) {
                domElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                domElement.classList.add('nexus-highlight-flash');
                setTimeout(() => {
                    domElement.classList.remove('nexus-highlight-flash');
                }, 1500);
            }
        } catch (e) {
            console.error("Failed to scroll to node DOM:", e);
        }
    };

    const handleCropSave = async (file, blobUrl) => {
        setIsCroppingImageUpload(true);
        try {
            const res = await questionService.uploadStimulusImage(file);
            const url = res.url;
            
            if (croppingImage) {
                if (croppingImage.type === 'standalone') {
                    updateStandaloneImage(croppingImage.pos, croppingImage.node, croppingImage.align, croppingImage.width, url);
                } else {
                    updateQuestionBlockImage(
                        croppingImage.pos, 
                        croppingImage.attrs, 
                        croppingImage.context, 
                        croppingImage.index, 
                        croppingImage.align, 
                        croppingImage.width, 
                        url
                    );
                }
                
                if (selectedImageConfig && selectedImageConfig.src === croppingImage.src) {
                    setSelectedImageConfig(prev => ({ ...prev, src: url }));
                }
                
                setCroppingImage(null);
            } else if (selectedImageConfig && selectedImageConfig.onUpdate) {
                selectedImageConfig.onUpdate(selectedImageConfig.align, selectedImageConfig.width, url);
                setSelectedImageConfig(prev => ({ ...prev, src: url }));
            }
        } catch (err) {
            addToast('Image upload failed: ' + (err.response?.data?.message || err.message), 'error');
        } finally {
            setIsCroppingImageUpload(false);
            setIsCropperOpen(false);
        }
    };

    return (
        <div style={{ 
            width: isMobileApp ? 'min(85vw, 340px)' : (isRightPanelOpen ? 'var(--right-panel-width, 420px)' : '0px'),
            transform: isMobileApp ? (isRightPanelOpen ? 'translate3d(0, 0, 0)' : 'translate3d(100%, 0, 0)') : 'none',
            transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1), width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            visibility: (isMobileApp && !isRightPanelOpen) ? 'hidden' : 'visible'
        }}
             className={`${!isDraggingRight ? 'transition-all' : ''} border-l border-slate-200 shrink-0 flex flex-col top-0 right-0 h-full overflow-hidden print:hidden ${
                 isMobileApp 
                     ? 'absolute z-30 shadow-2xl rounded-l-2xl' 
                     : 'relative shadow-none'
             }`}>
            
            {/* Resize Handle */}
            <div onMouseDown={() => setIsDraggingRight(true)}
                 className={`absolute top-0 left-[-3px] w-[6px] h-full cursor-col-resize z-40 transition-colors hover:bg-indigo-400 ${!isMobileApp ? 'block' : 'hidden'} ${isDraggingRight ? 'bg-indigo-500' : 'bg-transparent'}`} />

            <div className="h-full flex flex-col bg-white w-full">
                <div className="p-3 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Settings2 size={16} className="text-indigo-500"/> {t[activeTab]}
                    </h2>
                    <button onClick={() => setIsRightPanelOpen(false)} className="text-slate-400 hover:text-slate-700 rounded p-1 hover:bg-slate-200 transition-colors">
                        <PanelRightClose size={14}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {activeTab !== 'templates' && activeTab !== 'imageProps' && activeTab !== 'image' && (
                        <SettingsPanel s={docSettings} u={updateSetting} uMulti={updateMultiSettings} activeTab={activeTab} uiLang={uiLang} documentQuestions={documentQuestions} />
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
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedImageConfig({...selectedImageConfig, width: 'auto'});
                                                selectedImageConfig.onUpdate(selectedImageConfig.align, 'auto');
                                            }}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors whitespace-nowrap ${
                                                (selectedImageConfig.width === 'auto' || !selectedImageConfig.width) ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        >
                                            {uiLang === 'bn' ? 'অটো' : 'Auto'}
                                        </button>
                                        <div className="flex-1">
                                            <ImageSizeInput
                                                value={selectedImageConfig.width || 'auto'}
                                                onChange={(newVal) => {
                                                    setSelectedImageConfig({...selectedImageConfig, width: newVal});
                                                    selectedImageConfig.onUpdate(selectedImageConfig.align, newVal);
                                                }}
                                                className="w-full text-center bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium rounded-md py-1.5 px-3 outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                                            />
                                        </div>
                                    </div>

                                    {/* Slider */}
                                    <ImageSizeSlider
                                        value={selectedImageConfig.width}
                                        onChange={(newVal) => {
                                            setSelectedImageConfig({...selectedImageConfig, width: newVal});
                                            selectedImageConfig.onUpdate(selectedImageConfig.align, newVal);
                                        }}
                                        containerClass="flex items-center gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100"
                                        labelClass="text-xs text-indigo-600 font-bold min-w-[36px] text-right"
                                    />
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

                    {activeTab === 'image' && (() => {
                        const imagesList = getAllImages(documentQuestions, editor, uiLang);
                        if (imagesList.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400 text-center">
                                    <ImageIcon size={48} className="text-slate-300 stroke-[1.2] mb-3 animate-pulse" />
                                    <p className="text-sm font-medium">{t.noImages || 'No images found in the document.'}</p>
                                </div>
                            );
                        }

                        return (
                            <div className="p-4 space-y-4">
                                <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex items-start gap-3">
                                    <ImageIcon size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h3 className="text-xs font-bold text-indigo-900 leading-tight">
                                            {uiLang === 'bn' ? 'ইমেজ ম্যানেজার' : 'Image Manager'}
                                        </h3>
                                        <p className="text-[11px] text-indigo-750/90 leading-normal font-medium mt-1">
                                            {uiLang === 'bn' 
                                                ? 'ডকুমেন্টের সকল ছবি নিচে তালিকাভুক্ত রয়েছে। ছবিতে ক্লিক করে সেই স্থানে স্ক্রোল করতে পারেন এবং সাইজ ও অ্যালাইনমেন্ট সরাসরি আপডেট করতে পারেন।'
                                                : 'All images in the document are listed below. Click on an image to scroll to it, and adjust its size or alignment directly.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {imagesList.map((img, idx) => {
                                        const imgId = img.type === 'questionBlock' ? `${img.src}-${img.index}` : `standalone-${img.pos}`;
                                        return (
                                            <div key={imgId} 
                                                 onClick={() => handleImageClick(img)}
                                                 className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 cursor-pointer group flex flex-col gap-3 relative overflow-hidden"
                                            >
                                                <div className="flex gap-3">
                                                    {/* Thumbnail */}
                                                    <div className="w-[72px] h-[72px] bg-slate-50 border border-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-300">
                                                        <img 
                                                            src={img.src} 
                                                            alt={img.alt || 'img'} 
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>

                                                    {/* Details & Actions */}
                                                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                                                        <div>
                                                            <div className="text-[12px] font-bold text-slate-700 truncate leading-snug group-hover:text-indigo-600 transition-colors">
                                                                {img.label}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
                                                                {img.type === 'standalone' 
                                                                    ? (uiLang === 'bn' ? 'স্ট্যান্ডঅ্যালোন ইমেজ' : 'Standalone Image') 
                                                                    : (uiLang === 'bn' ? 'কোয়েশ্চেন ব্লক ইমেজ' : 'Question Block Image')}
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 mt-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setCroppingImage(img);
                                                                    setIsCropperOpen(true);
                                                                }}
                                                                disabled={isCroppingImageUpload}
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600 rounded-lg hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
                                                            >
                                                                <Crop size={11} className="stroke-[2.5]" />
                                                                {uiLang === 'bn' ? 'ক্রপ / এডিট' : 'Crop / Edit'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Width and Alignment Controls */}
                                                <div className="space-y-3 pt-2.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                                                    <div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                                            {uiLang === 'bn' ? 'সাইজ (প্রস্থ)' : 'Width (Size)'}
                                                        </div>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-1.5">
                                                                <button
                                                                    onClick={() => {
                                                                        if (img.type === 'standalone') {
                                                                            updateStandaloneImage(img.pos, img.node, img.align, 'auto', img.src);
                                                                        } else {
                                                                            updateQuestionBlockImage(img.pos, img.attrs, img.context, img.index, img.align, 'auto', img.src);
                                                                        }
                                                                    }}
                                                                    className={`px-2 py-1 text-[10px] font-extrabold rounded-md transition-colors whitespace-nowrap ${
                                                                        (!img.width || img.width === 'auto') ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                                    }`}
                                                                >
                                                                    {uiLang === 'bn' ? 'অটো' : 'Auto'}
                                                                </button>
                                                                <div className="flex-1">
                                                                    <ImageSizeInput
                                                                        value={img.width || 'auto'}
                                                                        onChange={(newVal) => {
                                                                            if (img.type === 'standalone') {
                                                                                updateStandaloneImage(img.pos, img.node, img.align, newVal, img.src);
                                                                            } else {
                                                                                updateQuestionBlockImage(img.pos, img.attrs, img.context, img.index, img.align, newVal, img.src);
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                                                            <ImageSizeSlider
                                                                value={img.width}
                                                                onChange={(newVal) => {
                                                                    if (img.type === 'standalone') {
                                                                        updateStandaloneImage(img.pos, img.node, img.align, newVal, img.src);
                                                                    } else {
                                                                        updateQuestionBlockImage(img.pos, img.attrs, img.context, img.index, img.align, newVal, img.src);
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                                                            {uiLang === 'bn' ? 'অ্যালাইনমেন্ট' : 'Alignment'}
                                                        </div>
                                                        <div className="flex bg-slate-100 p-0.5 rounded-lg w-full max-w-[200px]">
                                                            {['left', 'center', 'right'].map(align => (
                                                                <button key={align} 
                                                                    onClick={() => {
                                                                        if (img.type === 'standalone') {
                                                                            updateStandaloneImage(img.pos, img.node, align, img.width, img.src);
                                                                        } else {
                                                                            updateQuestionBlockImage(img.pos, img.attrs, img.context, img.index, align, img.width, img.src);
                                                                        }
                                                                    }}
                                                                    className={`flex-1 flex justify-center py-1 rounded-md transition-all ${
                                                                        img.align === align ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
                                                                    }`}
                                                                >
                                                                    {align === 'left' ? <AlignLeft size={12} className="stroke-[2.5]"/> : align === 'center' ? <AlignCenter size={12} className="stroke-[2.5]"/> : <AlignRight size={12} className="stroke-[2.5]"/>}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Image Editor Modal */}
                    <ImageEditorModal 
                        isOpen={isCropperOpen}
                        src={croppingImage ? croppingImage.src : selectedImageConfig?.src}
                        onClose={() => {
                            setIsCropperOpen(false);
                            setCroppingImage(null);
                        }}
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

                            {/* Subject & Class Specific Default Layout Setup */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Settings2 size={14} className="text-indigo-500" />
                                    {uiLang === 'bn' ? 'ডিফল্ট লেআউট সেটিংস' : 'Default Layout Settings'}
                                </h3>
                                <p className="text-[11px] text-slate-500 leading-normal mb-3 font-medium">
                                    {uiLang === 'bn' 
                                        ? 'শ্রেণী-বিষয়ভিত্তিক অথবা সাধারণ বিষয়ভিত্তিক ডিফল্ট লেআউট সংরক্ষণ করুন।' 
                                        : 'Save or apply layout defaults at Class-Subject or Global Subject levels.'}
                                </p>
                                
                                {/* Class & Subject Level Default */}
                                <div className="p-2.5 bg-white border border-slate-200 rounded-lg mb-3">
                                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">
                                        {uiLang === 'bn' ? '১. শ্রেণী ও বিষয় ডিফল্ট' : '1. Class & Subject Default'}
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mb-3 text-xs">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block">{uiLang === 'bn' ? 'শ্রেণী' : 'Class'}</span>
                                            <span className="font-bold text-slate-700 truncate block">{docSettings.className || (uiLang === 'bn' ? 'সেট করা নেই' : 'Not Set')}</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block">{uiLang === 'bn' ? 'বিষয়' : 'Subject'}</span>
                                            <span className="font-bold text-slate-700 truncate block">{docSettings.subject || (uiLang === 'bn' ? 'সেট করা নেই' : 'Not Set')}</span>
                                        </div>
                                    </div>
                                    
                                    {(() => {
                                        const normSubject = getNormalizedSubjectKey(docSettings.subject);
                                        const normClass = getNormalizedClassKey(docSettings.className);
                                        const hasSavedDefault = docSettings.subject && docSettings.className && savedClassSubjectsList.some(item => {
                                            if (typeof item === 'string') {
                                                const parts = item.split('_');
                                                for (let i = 1; i < parts.length; i++) {
                                                    const cPart = parts.slice(0, i).join('_');
                                                    const sPart = parts.slice(i).join('_');
                                                    if (getNormalizedClassKey(cPart) === normClass && getNormalizedSubjectKey(sPart) === normSubject) {
                                                        return true;
                                                    }
                                                }
                                                return false;
                                            } else {
                                                return (item.classSubjectId && item.classSubjectId === examData?.classSubjectId) ||
                                                       (item.className && getNormalizedClassKey(item.className) === normClass &&
                                                        item.subjectName && getNormalizedSubjectKey(item.subjectName) === normSubject);
                                            }
                                        });
                                        const isBtnDisabled = !docSettings.subject || !docSettings.className;
                                        
                                        return (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    disabled={isBtnDisabled}
                                                    onClick={() => saveSubjectDefaults(docSettings.subject, docSettings, 'class_subject', docSettings.className)}
                                                    className={`py-1.5 px-2 text-center rounded-lg text-xs font-bold transition-colors shadow-sm ${
                                                        isBtnDisabled 
                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                    }`}
                                                >
                                                    {uiLang === 'bn' 
                                                        ? (hasSavedDefault ? 'আপডেট' : 'সেভ') 
                                                        : (hasSavedDefault ? 'Update' : 'Save')}
                                                </button>
                                                <button 
                                                    disabled={isBtnDisabled}
                                                    onClick={() => loadSubjectDefaults(docSettings.subject, 'class_subject', docSettings.className)}
                                                    className={`py-1.5 px-2 text-center border rounded-lg text-xs font-bold transition-colors ${
                                                        isBtnDisabled
                                                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {uiLang === 'bn' ? 'লোড' : 'Load'}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Subject Only Level Default */}
                                <div className="p-2.5 bg-white border border-slate-200 rounded-lg mb-3">
                                    <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-2">
                                        {uiLang === 'bn' ? '২. বিষয় ডিফল্ট (সকল ক্লাস)' : '2. Subject Default (All Classes)'}
                                    </div>
                                    <div className="mb-3 text-xs">
                                        <span className="text-[10px] font-bold text-slate-400 block">{uiLang === 'bn' ? 'বিষয়' : 'Subject'}</span>
                                        <span className="font-bold text-slate-700 truncate block">{docSettings.subject || (uiLang === 'bn' ? 'সেট করা নেই' : 'Not Set')}</span>
                                    </div>
                                    {(() => {
                                         const normSubject = getNormalizedSubjectKey(docSettings.subject);
                                         const hasSavedDefault = docSettings.subject && savedSubjectsList.some(sub => {
                                             const subName = typeof sub === 'string' ? sub : (sub.subjectName || '');
                                             const subId = typeof sub === 'string' ? null : sub.subjectId;
                                             return (subId && subId === examData?.subjectId) || getNormalizedSubjectKey(subName) === normSubject;
                                         });
                                         const isBtnDisabled = !docSettings.subject;
                                        
                                        return (
                                            <div className="grid grid-cols-2 gap-2">
                                                <button 
                                                    disabled={isBtnDisabled}
                                                    onClick={() => saveSubjectDefaults(docSettings.subject, docSettings, 'subject_only')}
                                                    className={`py-1.5 px-2 text-center rounded-lg text-xs font-bold transition-colors shadow-sm ${
                                                        isBtnDisabled 
                                                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                                                            : 'bg-teal-600 text-white hover:bg-teal-700'
                                                    }`}
                                                >
                                                    {uiLang === 'bn' 
                                                        ? (hasSavedDefault ? 'আপডেট' : 'সেভ') 
                                                        : (hasSavedDefault ? 'Update' : 'Save')}
                                                </button>
                                                <button 
                                                    disabled={isBtnDisabled}
                                                    onClick={() => loadSubjectDefaults(docSettings.subject, 'subject_only')}
                                                    className={`py-1.5 px-2 text-center border rounded-lg text-xs font-bold transition-colors ${
                                                        isBtnDisabled
                                                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {uiLang === 'bn' ? 'লোড' : 'Load'}
                                                </button>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Class-Subject Saved List */}
                                {savedClassSubjectsList && savedClassSubjectsList.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            {uiLang === 'bn' ? 'সংরক্ষিত শ্রেণী-বিষয়ভিত্তিক তালিকা' : 'Class-Subject Saved List'}
                                        </div>
                                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                            {savedClassSubjectsList.map(item => {
                                                let displayClass = '';
                                                let displaySubject = '';
                                                let keyVal = '';
                                                
                                                if (typeof item === 'string') {
                                                    keyVal = item;
                                                    const parts = item.split('_');
                                                    if (parts.length > 1) {
                                                        displayClass = parts[0];
                                                        displaySubject = parts.slice(1).join(' ');
                                                    } else {
                                                        displayClass = 'General';
                                                        displaySubject = item;
                                                    }
                                                } else {
                                                    keyVal = item.key;
                                                    displayClass = item.className || 'General';
                                                    displaySubject = item.subjectName || 'General';
                                                }
                                                
                                                return (
                                                    <div key={keyVal} className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-100 rounded-md text-xs">
                                                        <span className="font-semibold text-slate-600 capitalize truncate max-w-[120px]" title={`${displayClass} - ${displaySubject}`}>
                                                            {displayClass} - {displaySubject}
                                                        </span>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button 
                                                                onClick={() => loadSubjectDefaults(keyVal, 'class_subject', displayClass)}
                                                                className="text-[10px] font-bold text-indigo-600 hover:underline"
                                                            >
                                                                {uiLang === 'bn' ? 'অ্যাপ্লাই' : 'Apply'}
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteSubjectDefault(keyVal, 'class_subject', displayClass)}
                                                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                                                            >
                                                                {uiLang === 'bn' ? 'মুছুন' : 'Delete'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
 
                                {/* Subject-Only Saved List */}
                                {savedSubjectsList && savedSubjectsList.length > 0 && (
                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                                            {uiLang === 'bn' ? 'সংরক্ষিত বিষয়ভিত্তিক তালিকা' : 'Global Subject Saved List'}
                                        </div>
                                        <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                            {savedSubjectsList.map(sub => {
                                                const subName = typeof sub === 'string' ? sub : sub.subjectName;
                                                const subKey = typeof sub === 'string' ? sub : sub.key;
                                                return (
                                                    <div key={subKey} className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-100 rounded-md text-xs">
                                                        <span className="font-semibold text-slate-600 capitalize truncate max-w-[120px]">{subName}</span>
                                                        <div className="flex gap-2 shrink-0">
                                                            <button 
                                                                onClick={() => loadSubjectDefaults(subKey, 'subject_only')}
                                                                className="text-[10px] font-bold text-teal-600 hover:underline"
                                                            >
                                                                {uiLang === 'bn' ? 'অ্যাপ্লাই' : 'Apply'}
                                                            </button>
                                                            <button 
                                                                onClick={() => deleteSubjectDefault(subKey, 'subject_only')}
                                                                className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                                                            >
                                                                {uiLang === 'bn' ? 'মুছুন' : 'Delete'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                             })}
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
                                            addToast(uiLang === 'bn' ? "ডিফল্ট সেটিংস অ্যাপ্লাই করা হয়েছে।" : "Default settings applied.", 'success');
                                            const defaultSettings = {
                                                ...DEFAULT_SETTINGS,
                                                institute: docSettings?.institute || DEFAULT_SETTINGS.institute,
                                                subject: docSettings?.subject || DEFAULT_SETTINGS.subject,
                                                className: docSettings?.className || DEFAULT_SETTINGS.className,
                                                exam: docSettings?.exam || DEFAULT_SETTINGS.exam,
                                                group: docSettings?.group || DEFAULT_SETTINGS.group,
                                                board: docSettings?.board || DEFAULT_SETTINGS.board,
                                                year: docSettings?.year || DEFAULT_SETTINGS.year,
                                                time: docSettings?.time || DEFAULT_SETTINGS.time,
                                                totalMarks: docSettings?.totalMarks || DEFAULT_SETTINGS.totalMarks,
                                                templateId: 'default'
                                            };
                                            if (DEFAULT_SETTINGS.sections && docSettings?.sections) {
                                                defaultSettings.sections = DEFAULT_SETTINGS.sections.map((templateSec, idx) => {
                                                    const currentSec = docSettings.sections[idx];
                                                    return currentSec ? { ...templateSec, id: currentSec.id } : templateSec;
                                                });
                                            }
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
