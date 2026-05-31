import React, { useState, useEffect } from 'react';
import {
    Layout,
    Type,
    Image as ImageIcon,
    Link as LinkIcon,
    Save,
    Plus,
    Trash2,
    Pencil,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Settings,
    Eye,
    Globe,
    CheckCircle,
    XCircle,
    Loader2,
    Smartphone,
    Apple,
    Monitor,
    Cpu,
    UploadCloud,
    AlertTriangle
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

const PLATFORMS = [
    { id: 'ANDROID', name: 'Android', icon: Smartphone, color: 'bg-emerald-500 text-emerald-500' },
    { id: 'IOS', name: 'iOS', icon: Apple, color: 'bg-slate-800 text-slate-800' },
    { id: 'WINDOWS', name: 'Windows', icon: Monitor, color: 'bg-blue-500 text-blue-500' },
    { id: 'LINUX', name: 'Linux', icon: Cpu, color: 'bg-orange-500 text-orange-500' }
];

const LandingEditor = () => {
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [enabledLanguages, setEnabledLanguages] = useState(['en', 'bn']);
    const [defaultLanguage, setDefaultLanguage] = useState('en');
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [translating, setTranslating] = useState(false);

    // Dynamic App Publishing states
    const [isEditingApps, setIsEditingApps] = useState(false);
    const [appReleases, setAppReleases] = useState([]);
    const [releasesLoading, setReleasesLoading] = useState(false);
    const [activePlatformTab, setActivePlatformTab] = useState('ANDROID');
    
    // Form fields for App Releases
    const [newVersionName, setNewVersionName] = useState('');
    const [newVersionCode, setNewVersionCode] = useState('');
    const [newReleaseType, setNewReleaseType] = useState('STORE_LINK');
    const [newDownloadUrl, setNewDownloadUrl] = useState('');
    const [newChangelog, setNewChangelog] = useState('');
    const [newIsForceUpdate, setNewIsForceUpdate] = useState(false);
    const [newActive, setNewActive] = useState(true);
    const [fileUploading, setFileUploading] = useState(false);
    const [editingReleaseId, setEditingReleaseId] = useState(null);

    useEffect(() => {
        fetchSections();
        fetchAppReleases();
    }, []);

    const fetchSections = async () => {
        setLoading(true);
        try {
            const [data, settingsData] = await Promise.all([
                cmsService.getSections(),
                settingsService.getGlobalSettings('GENERAL').catch(() => ({}))
            ]);
            setSections(data);
            if (data.length > 0 && !isEditingApps) {
                setActiveSectionId(data[0].id);
            }

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

    const fetchAppReleases = async () => {
        setReleasesLoading(true);
        try {
            const releases = await cmsService.getAppReleases();
            setAppReleases(releases);
        } catch (err) {
            console.error('Failed to fetch app releases:', err);
        } finally {
            setReleasesLoading(false);
        }
    };

    const handleStartEditRelease = (release) => {
        setEditingReleaseId(release.id);
        setNewVersionName(release.versionName || '');
        setNewVersionCode(release.versionCode !== undefined ? release.versionCode.toString() : '');
        setNewReleaseType(release.releaseType || 'STORE_LINK');
        setNewDownloadUrl(release.downloadUrl || '');
        setNewChangelog(release.changelog || '');
        setNewIsForceUpdate(!!release.forceUpdate);
        setNewActive(!!release.active);
    };

    const handleCancelEditRelease = () => {
        setEditingReleaseId(null);
        setNewVersionName('');
        setNewVersionCode('');
        setNewReleaseType('STORE_LINK');
        setNewDownloadUrl('');
        setNewChangelog('');
        setNewIsForceUpdate(false);
        setNewActive(true);
    };

    const handlePublishRelease = async (e) => {
        e.preventDefault();
        if (!newVersionName.trim()) return alert("Version name is required");
        if (!newVersionCode) return alert("Version code is required");
        if (newReleaseType === 'STORE_LINK' && !newDownloadUrl.trim()) return alert("Store link URL is required");
        if (newReleaseType === 'FILE_UPLOAD' && !newDownloadUrl.trim()) return alert("Please upload a file or enter download URL");

        try {
            const releaseData = {
                platform: activePlatformTab,
                versionName: newVersionName,
                versionCode: parseInt(newVersionCode),
                releaseType: newReleaseType,
                downloadUrl: newDownloadUrl,
                changelog: newChangelog,
                isForceUpdate: newIsForceUpdate,
                active: newActive
            };

            if (editingReleaseId) {
                await cmsService.updateAppRelease(editingReleaseId, releaseData);
                alert("App release updated successfully!");
            } else {
                await cmsService.createAppRelease(releaseData);
                alert("App release published successfully!");
            }

            // Reset form
            handleCancelEditRelease();
            
            // Refresh releases
            fetchAppReleases();
        } catch (err) {
            alert((editingReleaseId ? "Failed to update release: " : "Failed to publish release: ") + err.message);
        }
    };

    const handleDeleteRelease = async (id) => {
        if (!window.confirm("Are you sure you want to delete this release?")) return;
        try {
            await cmsService.deleteAppRelease(id);
            alert("Release deleted successfully");
            fetchAppReleases();
        } catch (err) {
            alert("Failed to delete release: " + err.message);
        }
    };

    const handleAppFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFileUploading(true);
        try {
            const res = await cmsService.uploadAppFile(file, activePlatformTab);
            if (res.url) {
                setNewDownloadUrl(res.url);
                alert("File uploaded successfully to Cloudflare R2!");
            } else {
                alert("Upload failed. No URL returned.");
            }
        } catch (err) {
            alert("Upload failed: " + err.message);
        } finally {
            setFileUploading(false);
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
            if (langCode === 'bn') return contentValue; // Fallback
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

    // Filter releases for currently active platform
    const platformReleases = appReleases.filter(r => r.platform === activePlatformTab);

    return (
        <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Landing Page CMS</h1>
                    <p className="text-slate-500 mt-1">Manage public marketing content and application releases without code changes.</p>
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition bg-white shadow-sm">
                        <Eye size={20} />
                        Live Preview
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition">
                        <Save size={20} />
                        Publish All
                    </button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Section List Sidebar */}
                <div className="w-full lg:w-1/3 xl:w-1/4 space-y-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-2 space-y-1">
                        <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 rounded-2xl mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Sections</span>
                        </div>
                        
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => {
                                    setActiveSectionId(section.id);
                                    setIsEditingApps(false);
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                                    activeSectionId === section.id && !isEditingApps
                                    ? 'bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200'
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

                        <div className="border-t border-slate-100 my-2 pt-2">
                            <button
                                onClick={() => {
                                    setActiveSectionId(null);
                                    setIsEditingApps(true);
                                }}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                                    isEditingApps
                                    ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-100'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Smartphone size={18} />
                                    <span className="text-sm font-bold">App Publishing</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                    <ChevronRight size={16} />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        {isEditingApps ? (
                            /* --- App Releases Management Panel --- */
                            <motion.div
                                key="app-publishing"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden"
                            >
                                {/* Header */}
                                <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div>
                                        <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">PRODUCTIONS & UPDATES</div>
                                        <h2 className="text-2xl font-black text-slate-900">App Publishing & Auto-Updates</h2>
                                    </div>
                                    <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs font-bold shadow-sm">
                                        <Globe size={14} className="animate-pulse" />
                                        Cloudflare R2 Storage Configured
                                    </div>
                                </div>

                                {/* Platform Selector */}
                                <div className="px-10 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2">
                                    {PLATFORMS.map(platform => {
                                        const IconComp = platform.icon;
                                        return (
                                            <button
                                                key={platform.id}
                                                onClick={() => {
                                                    setActivePlatformTab(platform.id);
                                                    setNewDownloadUrl(''); // Reset url input
                                                }}
                                                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all ${
                                                    activePlatformTab === platform.id
                                                        ? 'bg-slate-900 text-white shadow-md'
                                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                                }`}
                                            >
                                                <IconComp size={16} />
                                                {platform.name}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Main Content: Forms & History */}
                                <div className="p-10 grid grid-cols-1 xl:grid-cols-2 gap-10">
                                    
                                    {/* 1. Add New/Edit Release Form */}
                                    <div className={`space-y-6 border p-8 rounded-3xl transition-all duration-300 ${editingReleaseId ? 'bg-amber-50/20 border-amber-200 ring-2 ring-amber-500/5' : 'bg-slate-50/50 border-slate-100'}`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {editingReleaseId ? (
                                                <Pencil className="text-amber-600" size={20} />
                                            ) : (
                                                <Plus className="text-indigo-600" size={20} />
                                            )}
                                            <h3 className="font-extrabold text-slate-900 text-lg">
                                                {editingReleaseId ? `Edit ${PLATFORMS.find(p => p.id === activePlatformTab)?.name} Release` : `Publish New ${PLATFORMS.find(p => p.id === activePlatformTab)?.name} Release`}
                                            </h3>
                                        </div>

                                        <form onSubmit={handlePublishRelease} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version Name</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. 1.0.4"
                                                        value={newVersionName}
                                                        onChange={e => setNewVersionName(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version Code (Numeric)</label>
                                                    <input 
                                                        type="number" 
                                                        placeholder="e.g. 5"
                                                        value={newVersionCode}
                                                        onChange={e => setNewVersionCode(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Release Type</label>
                                                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                                                    <button
                                                        type="button"
                                                        onClick={() => { setNewReleaseType('STORE_LINK'); setNewDownloadUrl(''); }}
                                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                                            newReleaseType === 'STORE_LINK'
                                                            ? 'bg-white text-slate-800 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                        }`}
                                                    >
                                                        App Store / Play Store Link
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setNewReleaseType('FILE_UPLOAD'); setNewDownloadUrl(''); }}
                                                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${
                                                            newReleaseType === 'FILE_UPLOAD'
                                                            ? 'bg-white text-slate-800 shadow-sm'
                                                            : 'text-slate-500 hover:text-slate-800'
                                                        }`}
                                                    >
                                                        Upload Direct File (CDN)
                                                    </button>
                                                </div>
                                            </div>

                                            {newReleaseType === 'STORE_LINK' ? (
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Direct Store URL</label>
                                                    <input 
                                                        type="text" 
                                                        placeholder="https://play.google.com/store/apps/details?id=..."
                                                        value={newDownloadUrl}
                                                        onChange={e => setNewDownloadUrl(e.target.value)}
                                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition text-sm"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cloudflare R2 File Upload</label>
                                                    
                                                    {newDownloadUrl ? (
                                                        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col gap-2">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-xs font-bold text-emerald-800 truncate flex-1 mr-2">{newDownloadUrl}</span>
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => setNewDownloadUrl('')}
                                                                    className="text-xs text-red-500 font-bold hover:underline"
                                                                >
                                                                    Remove File
                                                                </button>
                                                            </div>
                                                            <span className="text-[10px] text-emerald-600 font-medium">✓ Binary uploaded successfully to your R2 Bucket.</span>
                                                        </div>
                                                    ) : (
                                                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-white hover:bg-slate-50 transition relative flex flex-col items-center justify-center text-center group">
                                                            <input 
                                                                type="file"
                                                                onChange={handleAppFileUpload}
                                                                disabled={fileUploading}
                                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                            />
                                                            {fileUploading ? (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <Loader2 size={32} className="text-indigo-600 animate-spin" />
                                                                    <span className="text-xs font-bold text-indigo-600">Uploading executable to R2...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <UploadCloud size={32} className="text-slate-400 group-hover:text-indigo-600 transition" />
                                                                    <span className="text-xs font-bold text-slate-700">Drag or Click to upload binary file</span>
                                                                    <span className="text-[10px] text-slate-400">Supports .apk, .exe, .msi, .deb, etc.</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version Changelog</label>
                                                <textarea 
                                                    rows={3}
                                                    placeholder="• Added new offline features&#10;• Fixed lag issues"
                                                    value={newChangelog}
                                                    onChange={e => setNewChangelog(e.target.value)}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition text-sm"
                                                />
                                            </div>

                                            <div className="flex gap-6 py-2">
                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox"
                                                        checked={newIsForceUpdate}
                                                        onChange={e => setNewIsForceUpdate(e.target.checked)}
                                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                                        <AlertTriangle size={14} className="text-amber-500" />
                                                        Force Update
                                                    </span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox"
                                                        checked={newActive}
                                                        onChange={e => setNewActive(e.target.checked)}
                                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <span className="text-xs font-bold text-slate-600">Active Release</span>
                                                </label>
                                            </div>

                                            <div className="flex gap-3 mt-4">
                                                {editingReleaseId && (
                                                    <button 
                                                        type="button"
                                                        onClick={handleCancelEditRelease}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 rounded-xl transition text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                                <button 
                                                    type="submit"
                                                    disabled={fileUploading}
                                                    className={`flex-1 flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl transition shadow-lg text-sm ${
                                                        editingReleaseId 
                                                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100' 
                                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                                                    } disabled:bg-slate-200`}
                                                >
                                                    <Save size={18} />
                                                    {editingReleaseId ? 'Save Changes' : 'Publish App Version'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    {/* 2. Platform Releases History */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <Settings className="text-slate-400" size={20} />
                                                <h3 className="font-extrabold text-slate-900 text-lg">Release History ({PLATFORMS.find(p => p.id === activePlatformTab)?.name})</h3>
                                            </div>
                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                                                {platformReleases.length} releases
                                            </span>
                                        </div>

                                        {releasesLoading ? (
                                            <div className="flex flex-col items-center justify-center p-20">
                                                <Loader2 size={32} className="text-slate-300 animate-spin mb-2" />
                                                <span className="text-xs text-slate-400">Loading version logs...</span>
                                            </div>
                                        ) : platformReleases.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center p-20 border border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                                                <Smartphone size={32} className="text-slate-300 mb-2" />
                                                <span className="text-xs font-bold text-slate-400">No versions published yet for this platform.</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                                {platformReleases.map(release => (
                                                    <div 
                                                        key={release.id}
                                                        className={`p-6 border rounded-2xl bg-white shadow-sm flex flex-col gap-3 transition-all hover:shadow-md ${
                                                            release.active 
                                                            ? 'border-slate-100 ring-1 ring-slate-100' 
                                                            : 'border-slate-200 opacity-60'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-slate-800 text-base">v{release.versionName}</span>
                                                                    <span className="bg-slate-100 text-slate-500 text-[9px] font-extrabold px-2 py-0.5 rounded">Code: {release.versionCode}</span>
                                                                    {release.active && (
                                                                        <span className="bg-emerald-50 text-emerald-600 text-[9px] font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                                                                            <CheckCircle size={10} /> Active
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-slate-400 block mt-1">
                                                                    Published: {new Date(release.createdAt).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => handleStartEditRelease(release)}
                                                                    className={`p-1.5 rounded-lg transition ${
                                                                        editingReleaseId === release.id
                                                                        ? 'text-amber-600 bg-amber-50'
                                                                        : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                                    }`}
                                                                    title="Edit Release"
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteRelease(release.id)}
                                                                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                                                                    title="Delete Release"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl flex flex-col gap-1 border border-slate-100/50">
                                                            <div className="font-bold text-slate-500 uppercase tracking-widest text-[9px] mb-1">Release Type: {release.releaseType.replace('_', ' ')}</div>
                                                            <a 
                                                                href={release.downloadUrl} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-indigo-600 hover:underline font-medium truncate inline-block max-w-full"
                                                            >
                                                                {release.downloadUrl}
                                                            </a>
                                                        </div>

                                                        {release.changelog && (
                                                            <div className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-3">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Changelog</span>
                                                                <div className="whitespace-pre-line leading-relaxed pl-1">{release.changelog}</div>
                                                            </div>
                                                        )}

                                                        {release.forceUpdate && (
                                                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1.5 rounded-xl w-fit">
                                                                <AlertTriangle size={12} className="text-amber-600" />
                                                                Mandatory Update (Force Update) Active
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ) : sections.find(s => s.id === activeSectionId) ? (
                            /* --- Standard Dynamic Content Section Editor --- */
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
                                                                item.contentKey.endsWith('CONTENT') ? (
                                                                    <textarea
                                                                        rows={16}
                                                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 transition font-mono text-sm leading-relaxed"
                                                                        value={getTranslationValue(item.contentValue, selectedLanguage)}
                                                                        onChange={e => updateTranslationValue(section.id, item.contentKey, selectedLanguage, e.target.value)}
                                                                    />
                                                                ) : (getTranslationValue(item.contentValue, selectedLanguage) || '').length > 100 ? (
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
