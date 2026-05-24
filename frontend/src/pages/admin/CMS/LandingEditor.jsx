import React, { useState, useEffect } from 'react';
import {
    Layout,
    Type,
    Image as ImageIcon,
    Link as LinkIcon,
    Save,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Settings,
    Eye,
    Globe,
    CheckCircle,
    XCircle,
    Loader2
} from 'lucide-react';
import cmsService from '../../../services/cmsService';
import settingsService from '../../../services/settingsService';
import { motion, AnimatePresence } from 'framer-motion';

const LANGUAGE_LABELS = {
    en: 'English (EN)',
    bn: 'Bengali (BN)',
    hi: 'Hindi (HI)',
    ar: 'Arabic (AR)',
    es: 'Spanish (ES)'
};

const LandingEditor = () => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [enabledLanguages, setEnabledLanguages] = useState(['en', 'bn']);
    const [defaultLanguage, setDefaultLanguage] = useState('en');
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [translating, setTranslating] = useState(false);

    useEffect(() => {
        fetchSections();
    }, []);

    const fetchSections = async () => {
        setLoading(true);
        try {
            const [data, settingsData] = await Promise.all([
                cmsService.getSections(),
                settingsService.getGlobalSettings('GENERAL').catch(() => ({}))
            ]);
            setSections(data);
            if (data.length > 0) setActiveSectionId(data[0].id);

            // Extract languages
            const enabledKey = Object.keys(settingsData).find(k => k.toLowerCase() === 'landing_enabled_languages');
            const defaultKey = Object.keys(settingsData).find(k => k.toLowerCase() === 'landing_default_language');
            
            const enabledVal = enabledKey ? settingsData[enabledKey] : 'en,bn';
            const defaultVal = defaultKey ? settingsData[defaultKey] : 'en';
            
            const langList = enabledVal.split(',');
            setEnabledLanguages(langList);
            setDefaultLanguage(defaultVal);
            setSelectedLanguage(defaultVal);
        } catch (err) {
            console.error('Failed to fetch CMS sections or settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTranslationValue = (contentValue, langCode) => {
        if (!contentValue) return '';
        try {
            const json = JSON.parse(contentValue);
            if (json && typeof json === 'object') {
                return json[langCode] || '';
            }
        } catch (e) {
            if (langCode === 'bn') return contentValue; // Fallback: existing string is Bengali
        }
        return '';
    };

    const updateTranslationValue = (sectionId, contentKey, langCode, newValue) => {
        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    contents: s.contents.map(c => {
                        if (c.contentKey === contentKey) {
                            let json = {};
                            try {
                                if (c.contentValue) {
                                    json = JSON.parse(c.contentValue);
                                    if (typeof json !== 'object' || json === null) {
                                        json = { bn: c.contentValue };
                                    }
                                }
                            } catch (e) {
                                json = { bn: c.contentValue };
                            }
                            json[langCode] = newValue;
                            return { ...c, contentValue: JSON.stringify(json) };
                        }
                        return c;
                    })
                };
            }
            return s;
        }));
    };

    const getSourceTranslation = (contentValue, targetLang) => {
        if (!contentValue) return null;
        try {
            const json = JSON.parse(contentValue);
            if (json && typeof json === 'object') {
                const langs = ['en', defaultLanguage, ...Object.keys(json)].filter(l => l !== targetLang);
                for (const l of langs) {
                    if (json[l] && json[l].trim()) {
                        return { lang: l, value: json[l] };
                    }
                }
            }
        } catch (e) {
            if (targetLang !== 'bn') {
                return { lang: 'bn', value: contentValue };
            }
        }
        return null;
    };

    const handleAutoTranslate = async (section) => {
        setTranslating(true);
        try {
            const updatedContents = [...section.contents];
            let translatedCount = 0;
            
            for (let c of updatedContents) {
                const source = getSourceTranslation(c.contentValue, selectedLanguage);
                if (source) {
                    if (c.contentType === 'IMAGE' || c.contentType === 'LINK') {
                        updateTranslationValue(section.id, c.contentKey, selectedLanguage, source.value);
                        translatedCount++;
                        continue;
                    }
                    
                    const resData = await cmsService.translateText(source.value, selectedLanguage);
                    const translatedText = resData.translation;
                    if (translatedText) {
                        updateTranslationValue(section.id, c.contentKey, selectedLanguage, translatedText);
                        translatedCount++;
                    }
                }
            }
            
            if (translatedCount > 0) {
                alert(`Auto-translation to ${LANGUAGE_LABELS[selectedLanguage] || selectedLanguage.toUpperCase()} completed! Review the fields and click "Save Section" to save.`);
            } else {
                // Check if the current tab has content that could be translated
                let hasCurrentText = false;
                for (let c of updatedContents) {
                    if (c.contentType === 'TEXT') {
                        const currentVal = getTranslationValue(c.contentValue, selectedLanguage);
                        if (currentVal && currentVal.trim()) {
                            hasCurrentText = true;
                            break;
                        }
                    }
                }
                
                if (hasCurrentText) {
                    const currentLangLabel = LANGUAGE_LABELS[selectedLanguage] || selectedLanguage.toUpperCase();
                    alert(`The current tab (${currentLangLabel}) has content, but other tabs are empty. To translate this content to another language (e.g., English), please switch to that language tab first, and then click "AI Auto Translate".`);
                } else {
                    alert('No source text found in other languages to translate from. Please enter text in at least one language first.');
                }
            }
        } catch (err) {
            console.error('Translation failed:', err);
            alert('Auto-translation failed. Please translate manually.');
        } finally {
            setTranslating(false);
        }
    };

    const handleContentUpdate = (sectionId, contentKey, newValue) => {
        setSections(prev => prev.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    contents: s.contents.map(c =>
                        c.contentKey === contentKey ? { ...c, contentValue: newValue } : c
                    )
                };
            }
            return s;
        }));
    };

    const handleStatusToggle = async (section) => {
        const newStatus = section.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            await cmsService.updateStatus(section.id, newStatus);
            fetchSections();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const handleSave = async (section) => {
        try {
            await cmsService.updateSection(section.id, {
                sectionName: section.sectionName,
                sortOrder: section.sortOrder,
                status: section.status,
                contents: section.contents
            });
            alert('Section updated successfully');
        } catch (err) {
            alert('Save failed: ' + err.message);
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Landing Page CMS</h1>
                    <p className="text-slate-500 mt-1">Manage public marketing content without code changes.</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition">
                        <Eye size={20} />
                        Live Preview
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">
                        <Save size={20} />
                        Publish All
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Section List */}
                <div className="w-full lg:w-1/3 xl:w-1/4 space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Sections</span>
                        </div>
                        <div className="p-2 space-y-1">
                            {sections.map(section => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSectionId(section.id)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition ${activeSectionId === section.id
                                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Layout size={18} />
                                        <span className="text-sm font-bold">{section.sectionName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {section.status === 'ACTIVE' ? (
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></div>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                        )}
                                        <ChevronRight size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        {sections.find(s => s.id === activeSectionId) ? (
                            <motion.div
                                key={activeSectionId}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden"
                            >
                                {(() => {
                                    const section = sections.find(s => s.id === activeSectionId);
                                    return (
                                        <>
                                            <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                                                <div>
                                                    <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">{section.sectionKey}</div>
                                                    <h2 className="text-2xl font-black text-slate-900">{section.sectionName}</h2>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        onClick={() => handleStatusToggle(section)}
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition ${section.status === 'ACTIVE'
                                                            ? 'bg-emerald-50 text-emerald-600'
                                                            : 'bg-slate-100 text-slate-500'
                                                            }`}
                                                    >
                                                        {section.status === 'ACTIVE' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                        {section.status}
                                                    </button>
                                                    <button
                                                        onClick={() => handleSave(section)}
                                                        className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold hover:bg-black transition shadow-lg shadow-slate-200"
                                                    >
                                                        <Save size={18} />
                                                        Save Section
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Dynamic Language Switcher Tabs Bar & AI Translate Button */}
                                            <div className="px-10 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                                                <div className="flex gap-2">
                                                    {enabledLanguages.map(lang => (
                                                        <button
                                                            key={lang}
                                                            onClick={() => setSelectedLanguage(lang)}
                                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                                selectedLanguage === lang
                                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <Globe size={14} />
                                                            {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                                {enabledLanguages.length > 1 && (
                                                    <button
                                                        onClick={() => handleAutoTranslate(section)}
                                                        disabled={translating}
                                                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                                                    >
                                                        {translating ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                                                        AI Auto Translate
                                                    </button>
                                                )}
                                            </div>

                                            <div className="p-10 space-y-8">
                                                <div className="grid grid-cols-1 gap-8">
                                                    {section.contents.map(item => (
                                                        <div key={item.contentKey} className="space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                {item.contentType === 'TEXT' ? <Type className="text-slate-400" size={16} /> :
                                                                    item.contentType === 'IMAGE' ? <ImageIcon className="text-slate-400" size={16} /> : <LinkIcon className="text-slate-400" size={16} />}
                                                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                                                    {item.contentKey.replace(/_/g, ' ')}
                                                                </label>
                                                            </div>
                                                            {item.contentType === 'TEXT' ? (
                                                                (getTranslationValue(item.contentValue, selectedLanguage) || '').length > 100 ? (
                                                                    <textarea
                                                                        rows={4}
                                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
                                                                        value={getTranslationValue(item.contentValue, selectedLanguage)}
                                                                        onChange={e => updateTranslationValue(section.id, item.contentKey, selectedLanguage, e.target.value)}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
                                                                        value={getTranslationValue(item.contentValue, selectedLanguage)}
                                                                        onChange={e => updateTranslationValue(section.id, item.contentKey, selectedLanguage, e.target.value)}
                                                                    />
                                                                )
                                                            ) : item.contentType === 'IMAGE' ? (
                                                                <div className="space-y-4">
                                                                    <div className="flex gap-4">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Image URL..."
                                                                            className="flex-1 px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/10 transition text-sm"
                                                                            value={getTranslationValue(item.contentValue, selectedLanguage)}
                                                                            onChange={e => updateTranslationValue(section.id, item.contentKey, selectedLanguage, e.target.value)}
                                                                        />
                                                                        <button className="px-6 py-4 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50">Upload</button>
                                                                    </div>
                                                                    {getTranslationValue(item.contentValue, selectedLanguage) && (
                                                                        <div className="w-40 h-24 rounded-2xl border border-slate-100 overflow-hidden bg-slate-50">
                                                                            <img src={getTranslationValue(item.contentValue, selectedLanguage)} alt="Preview" className="w-full h-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    placeholder="Link (e.g. /signup)..."
                                                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
                                                                    value={getTranslationValue(item.contentValue, selectedLanguage)}
                                                                    onChange={e => updateTranslationValue(section.id, item.contentKey, selectedLanguage, e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 opacity-50">
                                <Globe size={48} className="text-slate-200 mb-4" />
                                <h3 className="font-bold text-slate-400">Select a section to begin editing.</h3>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default LandingEditor;
