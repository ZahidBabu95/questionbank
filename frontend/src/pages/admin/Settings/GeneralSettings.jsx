import React, { useState, useEffect, useCallback } from 'react';
import {
    Save, RefreshCw, Globe, Image, Mail, Cpu, FileText, Database, Shield, Check,
    AlertTriangle, Settings, ChevronRight, Loader2, RotateCcw, UploadCloud, Zap, Wifi,
    Key, Plus, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff
} from 'lucide-react';
import settingsService from '../../../services/settingsService';
import { useBranding } from '../../../context/BrandingContext';
import axios from '../../../utils/axios';
import clsx from 'clsx';
import { useLanguage } from '../../../context/LanguageContext';



const ModelSelector = ({ isGoogle, value, onChange, placeholder, className }) => {
    const STANDARD_MODELS = [
        'gemini-3.5-flash',
        'gemini-3.5-pro',
        'gemini-3.1-pro-preview',
        'gemini-3-flash-preview',
        'gemini-3.1-flash-lite-preview',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-2.0-pro',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
        'gemini-1.5-flash'
    ];
    
    if (!isGoogle) {
        return <input type="text" className={className} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
    }

    const isCustom = value && !STANDARD_MODELS.includes(value) && value !== '';

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <select
                className={`${className} cursor-pointer`}
                value={isCustom ? 'custom' : (value || '')}
                onChange={e => {
                    const val = e.target.value;
                    onChange(val === 'custom' ? (value || '') : val);
                }}
            >
                <option value="" disabled>Select Model...</option>
                {STANDARD_MODELS.map(m => <option key={m} value={m}>{m}</option>)}
                <option value="custom">Custom (Type manually...)</option>
            </select>
            {isCustom && (
                <input
                    type="text"
                    className={className}
                    value={value || ''}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Enter custom model id"
                    autoFocus
                />
            )}
        </div>
    );
};

const GeneralSettings = () => {
    const { t, currentLang, refreshLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState('GENERAL');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({});
    const [originalSettings, setOriginalSettings] = useState({});
    const [message, setMessage] = useState(null);
    const branding = useBranding();

    const [testingApi, setTestingApi] = useState(false);
    const [testResult, setTestResult] = useState(null);

    const [testingStorage, setTestingStorage] = useState(false);
    const [storageTestResult, setStorageTestResult] = useState(null);

    // API Key Pool state
    const [apiKeys, setApiKeys] = useState([]);
    const [deletedApiKeys, setDeletedApiKeys] = useState([]);
    const [showAddKey, setShowAddKey] = useState(false);
    const [newApiKey, setNewApiKey] = useState({ keyName: '', apiKey: '', provider: 'Google', baseUrl: '', model: 'gemini-2.5-flash', dailyLimit: 50000, isPaid: false });
    const [activeProviderTab, setActiveProviderTab] = useState('Google');
    const [activePoolTab, setActivePoolTab] = useState('active');
    const [revealModal, setRevealModal] = useState({ show: false, keyId: null, password: '', revealedKey: null, error: null });

    // Provider tab definitions
    const PROVIDER_TABS = [
        { key: 'Google',      label: 'Gemini',      icon: '\uD83D\uDFE2', baseUrl: '',                             defaultModel: 'gemini-2.5-flash',         isGoogle: true  },
        { key: 'OpenAI',      label: 'OpenAI',      icon: '\u26AA',       baseUrl: 'https://api.openai.com/v1',      defaultModel: 'gpt-4o-mini',              isGoogle: false },
        { key: 'Anthropic',   label: 'Claude',      icon: '\uD83D\uDFE0', baseUrl: 'https://api.anthropic.com/v1',   defaultModel: 'claude-3-5-haiku-20241022', isGoogle: false },
        { key: 'OpenRouter',  label: 'OpenRouter',  icon: '\uD83D\uDD35', baseUrl: 'https://openrouter.ai/api/v1',   defaultModel: 'google/gemini-flash-1.5',   isGoogle: false },
        { key: 'AgentRouter', label: 'AgentRouter', icon: '\uD83D\uDFE3', baseUrl: 'https://agentrouter.org/v1',     defaultModel: 'gpt-5',                     isGoogle: false },
        { key: 'Custom',      label: 'Custom',      icon: '\u2699\uFE0F', baseUrl: '',                              defaultModel: '',                          isGoogle: false },
    ];

    const fetchApiKeys = async () => {
        try {
            const [keysRes, deletedRes] = await Promise.all([
                axios.get('/v1/ai/keys'),
                axios.get('/v1/ai/keys/deleted')
            ]);
            setApiKeys(keysRes.data?.data || []);
            setDeletedApiKeys(deletedRes.data?.data || []);
        } catch (e) { /* not super admin or no keys */ }
    };

    const addApiKey = async () => {
        if (!newApiKey.apiKey) return;
        try {
            await axios.post('/v1/ai/keys', {
                keyName:    newApiKey.keyName || `Key ${apiKeys.length + 1}`,
                apiKey:     newApiKey.apiKey,
                provider:   newApiKey.provider  || 'Google',
                baseUrl:    newApiKey.baseUrl   || '',
                model:      newApiKey.model     || '',
                dailyLimit: newApiKey.dailyLimit || 50000,
                isPaid:     newApiKey.isPaid || false
            });
            const cur = PROVIDER_TABS.find(t => t.key === activeProviderTab);
            setNewApiKey({ keyName: '', apiKey: '', provider: activeProviderTab, baseUrl: cur?.baseUrl || '', model: cur?.defaultModel || '', dailyLimit: 50000, isPaid: false });
            setShowAddKey(false);
            fetchApiKeys();
        } catch (e) { console.error(e); }
    };

    const toggleApiKey = async (id) => {
        try { await axios.put(`/v1/ai/keys/${id}/toggle`); fetchApiKeys(); } catch (e) { console.error(e); }
    };

    const saveEditedKey = async (id) => {
        try {
            await axios.put(`/v1/ai/keys/${id}`, editingKeyData);
            setEditingKeyId(null);
            fetchApiKeys();
        } catch (e) { console.error(e); }
    };

    const deleteApiKey = async (id) => {
        if (!confirm('Soft delete this key?')) return;
        try { await axios.delete(`/v1/ai/keys/${id}`); fetchApiKeys(); } catch (e) { console.error(e); }
    };

    const restoreApiKey = async (id) => {
        try { await axios.put(`/v1/ai/keys/${id}/restore`); fetchApiKeys(); } catch (e) { console.error(e); }
    };

    const hardDeleteApiKey = async (id) => {
        if (!confirm('PERMANENTLY delete this API key?')) return;
        try { await axios.delete(`/v1/ai/keys/hard/${id}`); fetchApiKeys(); } catch (e) { console.error(e); }
    };

    const handleRevealKey = async () => {
        if (!revealModal.password) {
            setRevealModal(p => ({ ...p, error: 'Password is required' }));
            return;
        }
        try {
            const res = await axios.post(`/v1/ai/keys/${revealModal.keyId}/reveal`, { password: revealModal.password });
            setRevealModal(p => ({ ...p, revealedKey: res.data.data.apiKey, error: null }));
        } catch (e) {
            setRevealModal(p => ({ ...p, error: e.response?.data?.message || 'Incorrect password' }));
        }
    };

    const [testingKeyId, setTestingKeyId] = useState(null);
    const [keyTestResult, setKeyTestResult] = useState(null);
    
    const [editingKeyId, setEditingKeyId] = useState(null);
    const [editingKeyData, setEditingKeyData] = useState({});

    const testApiKeyById = async (id) => {
        setTestingKeyId(id);
        setKeyTestResult(null);
        try {
            const res = await axios.post(`/v1/ai/keys/${id}/test`);
            setKeyTestResult({ id, ...(res.data?.data || {}) });
        } catch (e) {
            setKeyTestResult({ id, connected: false, error: e.message });
        }
        setTestingKeyId(null);
    };

    const [settingsScope, setSettingsScope] = useState('institute');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                const hasSuperRole = user.roles && (user.roles.includes('SUPER_ADMIN') || user.roles.includes('ROLE_SUPER_ADMIN'));
                setIsSuperAdmin(hasSuperRole);
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }
    }, []);


    const TABS = [
        { id: 'GENERAL', label: t('set_tab_general') || 'General', icon: Globe, description: t('set_desc_general') || 'System name, language, timezone' },
        { id: 'BRANDING', label: t('set_tab_branding') || 'Branding', icon: Image, description: t('set_desc_branding') || 'Colors, logo, footer' },
        { id: 'COMMUNICATION', label: t('set_tab_email_sms') || 'Email & SMS', icon: Mail, description: t('set_desc_communication') || 'SMTP and notification config' },
        { id: 'AI', label: t('set_tab_ai') || 'AI Config', icon: Cpu, description: t('set_desc_ai') || 'AI provider and model settings' },
        { id: 'EXAM', label: t('set_tab_exam') || 'Exam Defaults', icon: FileText, description: t('set_desc_exam') || 'Default exam parameters' },
        { id: 'STORAGE', label: t('set_tab_storage') || 'Storage', icon: Database, description: t('set_desc_storage') || 'File storage configuration' },
    ];

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        try {
            let data = {};
            try {
                if (isSuperAdmin) {
                    data = await settingsService.getGlobalSettings(activeTab);
                    setSettingsScope('global');
                } else {
                    data = await settingsService.getInstituteSettings(activeTab);
                    setSettingsScope('institute');
                }
            } catch (instErr) {
                try {
                    data = await settingsService.getGlobalSettings(activeTab);
                    setSettingsScope('global');
                } catch (globalErr) {
                    console.warn('Could not load settings from either endpoint. Showing defaults.');
                    data = {};
                    setSettingsScope(isSuperAdmin ? 'global' : 'institute');
                }
            }

            if (data && typeof data === 'object' && !Array.isArray(data)) {
                data = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});
            } else {
                data = {};
            }
            setSettings(data);
            setOriginalSettings(data);

        } catch (error) {
            console.error("Error fetching settings:", error);
            setMessage({ type: 'error', text: 'Failed to load settings. You may not have permission.' });
        } finally {
            setLoading(false);
        }
    }, [activeTab, isSuperAdmin]);


    useEffect(() => { fetchSettings(); }, [fetchSettings]);
    useEffect(() => { if (isSuperAdmin && activeTab === 'AI') fetchApiKeys(); }, [isSuperAdmin, activeTab]);

    useEffect(() => {
        if (activeTab !== 'STORAGE') {
            setStorageTestResult(null);
        }
    }, [activeTab]);

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            if (isSuperAdmin || settingsScope === 'global') {
                await settingsService.updateGlobalSettings(activeTab, settings);
                setMessage({ type: 'success', text: t('set_msg_saved_global') || 'Global branding settings saved successfully.' });
            } else {
                await settingsService.updateInstituteSettings(activeTab, settings);
                setMessage({ type: 'success', text: t('set_msg_saved_inst') || 'Institute settings saved successfully.' });
            }

            setOriginalSettings({ ...settings });

            if (settings.primary_color) document.documentElement.style.setProperty('--primary-color', settings.primary_color);
            if (settings.secondary_color) document.documentElement.style.setProperty('--secondary-color', settings.secondary_color);

            if (activeTab === 'BRANDING' || activeTab === 'GENERAL') {
                branding.refreshBranding();
            }

            if (activeTab === 'GENERAL') {
                refreshLanguage();
            }

        } catch (error) {
            console.error("Error saving settings:", error);
            setMessage({ type: 'error', text: t('set_msg_saved_error') || 'Failed to save settings. Check your permissions.' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        setSettings({ ...originalSettings });
        setMessage({ type: 'info', text: t('set_msg_reset') || 'Settings reset to last saved state.' });
    };

    const handleChange = (key, value) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            if (key === 'ai_google_model') next['ai_model'] = value;
            if (key === 'ai_google_dedicated_key') next['ai_api_key'] = value;
            if (key.endsWith('_mode')) next['ai_billing_mode'] = value;
            return next;
        });
    };

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

    /* ─── Form Helpers ─── */
    const renderInput = (key, label, type = "text", placeholder = "", description = "") => (
        <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            {description && <p className="text-[11px] text-slate-400 mb-2">{description}</p>}
            <input
                type={type}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-300"
                value={settings[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );

    const renderSelect = (key, label, options, description = "") => (
        <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            {description && <p className="text-[11px] text-slate-400 mb-2">{description}</p>}
            <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all"
                value={settings[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );

    const renderToggle = (key, label, description = "") => (
        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
            <div className="flex-1 mr-4">
                <span className="text-sm font-semibold text-slate-700 block">{label}</span>
                {description && <span className="text-[11px] text-slate-400 mt-0.5 block">{description}</span>}
            </div>
            <button
                type="button"
                onClick={() => handleChange(key, settings[key] === 'true' ? 'false' : 'true')}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${settings[key] === 'true' ? 'bg-primary' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${settings[key] === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    const renderTextarea = (key, label, placeholder = "", description = "") => (
        <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
            {description && <p className="text-[11px] text-slate-400 mb-2">{description}</p>}
            <textarea
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                value={settings[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );

    const renderImageUpload = (key, label, type = "logo", description = "") => {
        const handleFileUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setLoading(true);
            try {
                const data = await settingsService.uploadBrandingImage(file, type);
                handleChange(key, data.url);
                setMessage({ type: 'success', text: `${label} uploaded successfully.` });
            } catch (error) {
                console.error("Upload error:", error);
                setMessage({ type: 'error', text: `Failed to upload ${label}. Check storage configurations.` });
            } finally {
                setLoading(false);
            }
        };

        return (
            <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                {description && <p className="text-[11px] text-slate-400 mb-2">{description}</p>}

                <div className="flex items-center gap-4">
                    <div className={clsx(
                        "rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative group-hover:border-primary/30 transition-all shadow-inner",
                        type === 'logo' ? "w-40 h-16" : "w-16 h-16"
                    )}>
                        {settings[key] ? (
                            <img src={settings[key]} alt={label} className="max-w-[90%] max-h-[90%] object-contain drop-shadow-sm" />
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <Image size={24} className="text-slate-300" />
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">No {type}</span>
                            </div>
                        )}
                    </div>


                    <div className="flex-1 space-y-2">
                        <div className="relative">
                            <input
                                type="file"
                                id={`file-upload-${key}`}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileUpload}
                            />
                            <label
                                htmlFor={`file-upload-${key}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 hover:text-primary transition-colors cursor-pointer"
                            >
                                <UploadCloud size={16} />
                                Upload File
                            </label>
                        </div>
                        <input
                            type="url"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-300"
                            value={settings[key] || ''}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder="Or enter image URL..."
                        />
                    </div>
                </div>
            </div>
        );
    };

    const renderColorPicker = (key, label, defaultColor = '#3b82f6') => {
        const colorValue = settings[key] || defaultColor;
        const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(colorValue);
        return (
            <div className="group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                <div className="flex items-center gap-3">
                    <input
                        type="color"
                        value={isValidHex ? colorValue : defaultColor}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                        type="text"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all placeholder:text-slate-300 uppercase"
                        value={colorValue}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder="#3b82f6"
                        maxLength={7}
                    />
                    <div className="w-20 h-10 rounded-lg border border-slate-200 shadow-inner" style={{ backgroundColor: isValidHex ? colorValue : defaultColor }}></div>
                </div>
            </div>
        );
    };

    /* ─── Provider Tabs AI UI ─── */
    const renderAiProviderTabs = () => {
        const curTab = PROVIDER_TABS.find(t => t.key === activeProviderTab) || PROVIDER_TABS[0];
        const tabKeys = apiKeys.filter(k => (k.provider || 'Google') === activeProviderTab);
        const tabDeletedKeys = deletedApiKeys.filter(k => (k.provider || 'Google') === activeProviderTab);
        const isActiveProvider = (settings.ai_active_provider || 'Google') === activeProviderTab;

        return (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {/* Tab Bar */}
                <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
                    {PROVIDER_TABS.map(t => {
                        const isActive = activeProviderTab === t.key;
                        const keysForTab = apiKeys.filter(k => (k.provider || 'Google') === t.key);
                        const activeCount = keysForTab.filter(k => k.active).length;
                        const isCurrentActive = (settings.ai_active_provider || 'Google') === t.key;
                        return (
                            <button key={t.key} type="button"
                                onClick={() => { setActiveProviderTab(t.key); setShowAddKey(false); setKeyTestResult(null); }}
                                className={`relative flex items-center gap-1.5 px-3.5 py-3 text-xs font-semibold border-b-2 shrink-0 transition-all cursor-pointer
                                    ${isActive
                                        ? 'border-violet-500 text-violet-700 bg-white'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/70'}`}>
                                <span className="text-sm">{t.icon}</span>
                                <span>{t.label}</span>
                                {isCurrentActive && (
                                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                                )}
                                {keysForTab.length > 0 && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none
                                        ${activeCount > 0 ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'}`}>
                                        {keysForTab.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="p-4 space-y-4 bg-white">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="text-2xl">{curTab.icon}</span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-800">{curTab.label}</p>
                                    {isActiveProvider && (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">
                                            ACTIVE
                                        </span>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400">{curTab.isGoogle ? 'aistudio.google.com' : curTab.baseUrl || 'Custom endpoint'}</p>
                            </div>
                        </div>
                        <button type="button"
                            onClick={() => handleChange('ai_active_provider', activeProviderTab)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer
                                ${isActiveProvider
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-300'}`}>
                            {isActiveProvider ? '\u2705 Active' : 'Set as Active'}
                        </button>
                    </div>

                    {/* ── SMART POOL MODE ── */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-slate-500">
                                {tabKeys.length > 0
                                    ? <><span className="font-bold text-slate-700">{tabKeys.filter(k => k.active).length}</span> active / <span className="font-bold text-slate-700">{tabKeys.length}</span> total &nbsp;&middot;&nbsp; <span className="font-bold text-slate-700">{tabKeys.reduce((s, k) => s + (k.requestsToday || 0), 0)}</span> req today</>
                                    : <span className="text-slate-400">No pool keys yet for {curTab.label}</span>}
                            </div>
                            {isSuperAdmin && (
                                <button type="button"
                                    onClick={() => {
                                        setShowAddKey(!showAddKey);
                                        setNewApiKey(prev => ({ ...prev, provider: activeProviderTab, baseUrl: curTab.baseUrl, model: curTab.defaultModel }));
                                    }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-lg text-xs font-bold hover:bg-violet-100 transition-all cursor-pointer border border-violet-200">
                                    <Plus size={11} /> Add Key
                                </button>
                            )}
                        </div>

                        {/* Add Key Form */}
                        {showAddKey && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                            <p className="text-xs font-bold text-slate-600">New {curTab.label} Key</p>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" value={newApiKey.keyName}
                                    onChange={e => setNewApiKey(p => ({ ...p, keyName: e.target.value }))}
                                    className="px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-white"
                                    placeholder={`Name (e.g. ${curTab.label}-1)`} />
                                <div>
                                    <ModelSelector
                                        isGoogle={curTab.isGoogle}
                                        value={newApiKey.model || curTab.defaultModel}
                                        onChange={val => setNewApiKey(p => ({ ...p, model: val }))}
                                        placeholder={curTab.defaultModel || 'Model'}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-white"
                                    />
                                </div>
                            </div>
                            <input type="password" value={newApiKey.apiKey}
                                onChange={e => setNewApiKey(p => ({ ...p, apiKey: e.target.value }))}
                                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-white font-mono"
                                placeholder={curTab.isGoogle ? 'AIzaSy...' : 'sk-... or Bearer token'} />
                            {!curTab.isGoogle && (
                                <input type="url" value={newApiKey.baseUrl || curTab.baseUrl}
                                    onChange={e => setNewApiKey(p => ({ ...p, baseUrl: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-white font-mono"
                                    placeholder={curTab.baseUrl || 'API Base URL'} />
                            )}
                            <div className="flex gap-2">
                                <input type="number" value={newApiKey.dailyLimit}
                                    onChange={e => setNewApiKey(p => ({ ...p, dailyLimit: parseInt(e.target.value) || 50000 }))}
                                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-violet-400 bg-white"
                                    placeholder="Daily Limit" />
                                <button type="button" onClick={addApiKey}
                                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 cursor-pointer transition-colors">
                                    Save Key
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-2 px-1">
                                <input type="checkbox" id="add-paid-tier" checked={newApiKey.isPaid}
                                    onChange={e => setNewApiKey(p => ({ ...p, isPaid: e.target.checked, dailyLimit: e.target.checked ? 0 : 50000 }))}
                                    className="rounded text-violet-600 focus:ring-violet-500" />
                                <label htmlFor="add-paid-tier" className="text-[10px] font-bold text-violet-700">Mark as PAID Key (Unlimited Tier)</label>
                            </div>
                        </div>
                        )}

                        {/* Active vs Trash Tabs */}
                        <div className="flex border-b border-slate-200">
                            <button type="button" onClick={() => setActivePoolTab('active')}
                                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${activePoolTab === 'active' ? 'border-violet-500 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                Active Keys ({tabKeys.length})
                            </button>
                            <button type="button" onClick={() => setActivePoolTab('trash')}
                                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${activePoolTab === 'trash' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                Trash ({tabDeletedKeys.length})
                            </button>
                        </div>

                        {/* Key List */}
                        {(activePoolTab === 'active' ? tabKeys : tabDeletedKeys).length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-3xl mb-2">{curTab.icon}</p>
                                <p className="text-xs font-medium text-slate-400">No {curTab.label} keys found</p>
                                {activePoolTab === 'active' && <p className="text-[10px] text-slate-300 mt-0.5">Click "+ Add Key" to add one</p>}
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {(activePoolTab === 'active' ? tabKeys : tabDeletedKeys).map(k => {
                                    const pct = k.dailyLimit > 0 ? Math.round((k.requestsToday || 0) / k.dailyLimit * 100) : 0;
                                    return (
                                        <div key={k.id} className={`rounded-xl border transition-all overflow-hidden
                                            ${activePoolTab === 'trash' ? 'bg-rose-50/50 border-rose-100' : k.active ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                            <div className="flex items-center justify-between px-3 py-2.5">
                                            <div className="flex items-stretch px-3 py-2.5">
                                                {editingKeyId === k.id ? (
                                                    <div className="flex-1 space-y-2 pr-2">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <input type="text"
                                                                className="w-full px-2 py-1 text-xs border border-violet-200 rounded outline-none focus:border-violet-400 font-bold"
                                                                value={editingKeyData.keyName || ''}
                                                                onChange={e => setEditingKeyData({...editingKeyData, keyName: e.target.value})}
                                                                placeholder="Key Name" />
                                                            <div>
                                                                <ModelSelector
                                                                    isGoogle={curTab.isGoogle}
                                                                    value={editingKeyData.model || ''}
                                                                    onChange={val => setEditingKeyData({...editingKeyData, model: val})}
                                                                    placeholder="Model (e.g. gemini-2.5-flash)"
                                                                    className="w-full px-2 py-1 text-xs border border-violet-200 rounded outline-none focus:border-violet-400 font-mono"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input type="text" 
                                                                className="flex-1 px-2 py-1 text-xs border border-violet-200 rounded outline-none focus:border-violet-400 font-mono"
                                                                value={editingKeyData.apiKey || ''}
                                                                onChange={e => setEditingKeyData({...editingKeyData, apiKey: e.target.value})}
                                                                placeholder="API Key" />
                                                            <input type="number" 
                                                                className="w-24 px-2 py-1 text-xs border border-violet-200 rounded outline-none focus:border-violet-400"
                                                                value={editingKeyData.dailyLimit || ''}
                                                                onChange={e => setEditingKeyData({...editingKeyData, dailyLimit: parseInt(e.target.value) || 0})}
                                                                placeholder="Daily Limit" />
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 px-1">
                                                                <input type="checkbox" id={`edit-paid-${k.id}`} checked={editingKeyData.isPaid || false}
                                                                    onChange={e => setEditingKeyData(p => ({ ...p, isPaid: e.target.checked }))}
                                                                    className="rounded text-violet-600 focus:ring-violet-500" />
                                                                <label htmlFor={`edit-paid-${k.id}`} className="text-[10px] font-bold text-violet-700 cursor-pointer">PAID Tier</label>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => saveEditedKey(k.id)} className="px-3 py-1 bg-violet-600 text-white rounded text-xs font-bold hover:bg-violet-700 cursor-pointer transition-all">Save</button>
                                                                <button onClick={() => setEditingKeyId(null)} className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs cursor-pointer transition-all">Cancel</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
                                                                ${activePoolTab === 'trash' ? 'bg-rose-100' : k.active ? 'bg-gradient-to-br from-emerald-400 to-green-500' : 'bg-slate-200'}`}>
                                                                <Key size={12} className={activePoolTab === 'trash' ? 'text-rose-400' : 'text-white'} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <p className={`text-xs font-bold truncate ${activePoolTab === 'trash' ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-700'}`}>{k.keyName || 'Unnamed'}</p>
                                                                    {k.model && <span className="text-[9px] text-slate-400 font-mono shrink-0">{k.model}</span>}
                                                                    {(k.paidTier || k.isPaid) ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-100 text-purple-700 border border-purple-200">PAID</span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-600 border border-slate-200">FREE</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[160px] tracking-widest">{k.apiKey}</p>
                                                                    <button type="button" onClick={() => setRevealModal({ show: true, keyId: k.id, password: '', revealedKey: null, error: null })} title="Reveal Full Key" className="text-slate-300 hover:text-violet-500 transition-colors">
                                                                        <Eye size={12} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                            <div className="text-right mr-1">
                                                                <p className="text-[10px] font-bold text-slate-600">{k.requestsToday || 0}<span className="text-slate-400 font-normal text-[9px]">/{k.dailyLimit || '?'}</span></p>
                                                                <p className="text-[9px] text-slate-400">today</p>
                                                            </div>
                                                            {activePoolTab === 'active' ? (
                                                                <>
                                                                    <button type="button" onClick={() => testApiKeyById(k.id)} disabled={testingKeyId === k.id}
                                                                        className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-100 disabled:opacity-50 cursor-pointer transition-colors" title="Test Key">
                                                                        {testingKeyId === k.id ? <Loader2 size={11} className="animate-spin" /> : <Wifi size={11} />}
                                                                    </button>
                                                                    <button type="button" onClick={() => { setEditingKeyId(k.id); setEditingKeyData(k); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" title="Edit Key">
                                                                        <svg xmlns="http://www.-w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                                                    </button>
                                                                    <button type="button" onClick={() => toggleApiKey(k.id)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors" title="Toggle Active">
                                                                        {k.active ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
                                                                    </button>
                                                                    <button type="button" onClick={() => deleteApiKey(k.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 cursor-pointer transition-colors" title="Move to Trash">
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button type="button" onClick={() => restoreApiKey(k.id)}
                                                                        className="px-2 py-1.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1 transition-colors cursor-pointer" title="Restore Key">
                                                                        <RotateCcw size={10} /> Restore
                                                                    </button>
                                                                    <button type="button" onClick={() => hardDeleteApiKey(k.id)}
                                                                        className="px-2 py-1.5 rounded text-[10px] font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center gap-1 transition-colors cursor-pointer" title="Hard Delete Key">
                                                                        <Trash2 size={10} /> Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            </div>
                                            {/* Usage progress bar */}
                                            <div className="h-1 bg-slate-100">
                                                <div className={`h-full transition-all ${pct > 85 ? 'bg-rose-400' : pct > 60 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                                    style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Key Test Result */}
                    {keyTestResult && (
                        <div className={`p-3 rounded-xl border text-xs ${keyTestResult.connected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                            <strong>{keyTestResult.keyName}:</strong> {keyTestResult.connected
                                ? `\u2705 Connected (${keyTestResult.responseTimeMs}ms, model: ${keyTestResult.model || keyTestResult.provider})`
                                : `\u274C Failed: ${keyTestResult.error}`}
                        </div>
                    )}

                    {/* Test Connection */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                        <button type="button" disabled={testingApi}
                            onClick={async () => {
                                setTestingApi(true); setTestResult(null);
                                try {
                                    const res = await axios.post(`/v1/ai/test-connection?provider=${encodeURIComponent(activeProviderTab)}`);
                                    setTestResult(res.data?.data || { connected: false, error: 'Unknown' });
                                } catch (err) {
                                    setTestResult({ connected: false, error: err.response?.data?.message || err.message });
                                } finally { setTestingApi(false); }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-200 transition-all active:scale-[0.97] disabled:opacity-60 cursor-pointer">
                            {testingApi ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                            Test {curTab.label} Connection
                        </button>
                        {testResult && (
                            <span className={`text-xs font-semibold ${testResult.connected ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {testResult.connected
                                    ? `\u2705 ${testResult.responseTimeMs}ms \u00B7 ${testResult.model}`
                                    : `\u274C ${(testResult.error || '').slice(0, 70)}`}
                            </span>
                        )}
                    </div>
                </div>

                {/* Reveal Modal */}
                {revealModal.show && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Shield size={20} className="text-violet-600" /> API Key Security
                                </h3>
                                <button onClick={() => setRevealModal({ show: false, keyId: null, password: '', revealedKey: null, error: null })} className="text-slate-400 hover:text-slate-600 outline-none cursor-pointer">
                                    ✖
                                </button>
                            </div>
                            
                            {!revealModal.revealedKey ? (
                                <div className="space-y-4">
                                    <p className="text-sm text-slate-600">Please enter the super admin password to reveal this API key.</p>
                                    {revealModal.error && (
                                        <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">{revealModal.error}</p>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
                                        <input 
                                            type="password" 
                                            autoFocus
                                            value={revealModal.password} 
                                            onChange={e => setRevealModal(p => ({ ...p, password: e.target.value }))}
                                            onKeyDown={e => e.key === 'Enter' && handleRevealKey()}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500/30 outline-none"
                                            placeholder="Enter password..."
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button onClick={() => setRevealModal({ show: false, keyId: null, password: '', revealedKey: null, error: null })} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 cursor-pointer">
                                            Cancel
                                        </button>
                                        <button onClick={handleRevealKey} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 cursor-pointer">
                                            Reveal Key
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-3 rounded-lg text-sm font-bold flex items-center gap-2">
                                        <Check size={18} /> Access Granted
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Full API Key</label>
                                        <textarea 
                                            readOnly 
                                            value={revealModal.revealedKey} 
                                            className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 break-all resize-none h-24 focus:outline-none"
                                            onFocus={e => e.target.select()}
                                        />
                                        <p className="text-xs text-slate-400 mt-2">Click inside the box and press Ctrl+C to copy.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /* ─── Tab Content ─── */
    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Loader2 size={32} className="animate-spin mb-3" />
                    <p className="text-sm font-medium">{t('loading_settings') || 'Loading settings...'}</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'GENERAL': {
                const enabledLangs = (settings['landing_enabled_languages'] || 'en,bn').split(',');
                
                const toggleLanguageOption = (langCode) => {
                    let list = [...enabledLangs];
                    if (list.includes(langCode)) {
                        if (list.length > 1) {
                            list = list.filter(l => l !== langCode);
                        }
                    } else {
                        list.push(langCode);
                    }
                    handleChange('landing_enabled_languages', list.join(','));
                    
                    if (!list.includes(settings['landing_default_language'] || 'en')) {
                        handleChange('landing_default_language', list[0]);
                    }
                };

                const AVAILABLE_LANGUAGES = [
                    { code: 'en', label: 'English' },
                    { code: 'bn', label: 'Bengali (\u09AC\u09BE\u0982\u09B2\u09BE)' },
                    { code: 'hi', label: 'Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)' },
                    { code: 'ar', label: 'Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629)' },
                    { code: 'es', label: 'Spanish (Espa\u00F1ol)' },
                ];

                return (
                    <div className="space-y-5 max-w-2xl">
                        {renderInput('system_name', t('set_system_name') || 'System Name', 'text', 'QuestionShaper', t('set_system_name_desc') || 'The display name of your platform')}
                        {renderSelect('default_language', t('set_default_language') || 'Default Language', [
                            { value: '', label: 'Select language...' },
                            { value: 'English', label: 'English' },
                            { value: 'Bengali', label: 'Bengali (\u09AC\u09BE\u0982\u09B2\u09BE)' },
                            { value: 'Hindi', label: 'Hindi (\u0939\u093F\u0928\u094D\u0926\u0940)' },
                            { value: 'Arabic', label: 'Arabic (\u0627\u0644\u0639\u0631\u0628\u064A\u0629)' },
                        ], t('set_default_language_desc') || 'System default language for all users')}
                        
                        {/* Landing Page Language Selector (Dynamic & Checkbox controls) */}
                        <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <Globe size={16} className="text-primary" /> {t('set_landing_config') || 'Landing Page Languages Configuration'}
                            </h3>
                            <p className="text-[11px] text-slate-400">{t('set_landing_config_desc') || 'Enable languages for your public landing page. Administrators can translate marketing blocks for all enabled languages.'}</p>
                            
                            {/* Checkboxes */}
                            <div className="space-y-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('set_enabled_langs') || 'Enabled Languages'}</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {AVAILABLE_LANGUAGES.map(lang => {
                                        const isChecked = enabledLangs.includes(lang.code);
                                        return (
                                            <label key={lang.code} className="flex items-center gap-2 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-blue-200 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => toggleLanguageOption(lang.code)}
                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-xs font-bold text-slate-700">{lang.label}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            {/* Default Language selector */}
                            <div className="pt-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('set_default_landing_lang') || 'Default Landing Language'}</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all cursor-pointer"
                                    value={settings['landing_default_language'] || 'en'}
                                    onChange={(e) => handleChange('landing_default_language', e.target.value)}
                                >
                                    {AVAILABLE_LANGUAGES.filter(lang => enabledLangs.includes(lang.code)).map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {renderSelect('default_timezone', t('set_timezone') || 'Timezone', [
                            { value: '', label: 'Select timezone...' },
                            { value: 'UTC+6', label: 'UTC+6 (Bangladesh)' },
                            { value: 'UTC+5:30', label: 'UTC+5:30 (India)' },
                            { value: 'UTC+0', label: 'UTC+0 (London)' },
                            { value: 'UTC-5', label: 'UTC-5 (Eastern US)' },
                        ])}
                        {renderToggle('maintenance_mode', t('set_maintenance_mode') || 'Maintenance Mode', t('set_maintenance_mode_desc') || 'When enabled, users will see a maintenance page')}
                        {renderToggle('allow_registration', t('set_allow_registration') || 'Allow Public Registration', t('set_allow_registration_desc') || 'Allow new users to self-register on the platform')}
                    </div>
                );
            }
            case 'BRANDING':
                return (
                    <div className="space-y-5 max-w-2xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {renderColorPicker('primary_color', 'Primary Color', '#3b82f6')}
                            {renderColorPicker('secondary_color', 'Secondary Color', '#6366f1')}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            {renderImageUpload('logo_url', 'Logo Image', 'logo', 'Recommended size: 250x60px')}
                            {renderImageUpload('favicon_url', 'Favicon Image', 'favicon', 'Recommended size: 32x32px or 64x64px (.ico, .png)')}
                        </div>
                        {renderTextarea('footer_text', 'Footer Text', '\u00A9 2026 QuestionShaper. All rights reserved.', 'Displayed at the bottom of every page')}
                    </div>
                );
            case 'COMMUNICATION':
                return (
                    <div className="space-y-5 max-w-2xl">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-amber-700">Sensitive credentials are encrypted. Existing values show as masked (******).</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {renderInput('smtp_host', 'SMTP Host', 'text', 'smtp.gmail.com')}
                            {renderInput('smtp_port', 'SMTP Port', 'number', '587')}
                        </div>
                        {renderInput('smtp_username', 'SMTP Username', 'email', 'noreply@yoursite.com')}
                        {renderInput('smtp_password', 'SMTP Password', 'password', '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')}
                        {renderInput('sender_email', 'Default Sender Email', 'email', 'noreply@questionshaper.com')}
                        {renderInput('sender_name', 'Default Sender Name', 'text', 'QuestionShaper')}
                    </div>
                );
            case 'AI':
                return (
                    <div className="space-y-5 max-w-2xl">
                        {renderToggle('ai_enabled', 'Enable AI Features', 'Toggle AI-powered question generation and suggestions')}

                        {/* Global billing mode hint */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <p className="text-xs text-slate-500">
                                <span className="font-bold text-slate-700">Global Mode:</span>{' '}
                                Added keys automatically load balance. 
                                The <strong>Active Provider</strong> tab is used for all AI calls.
                            </p>
                        </div>

                        {/* Provider Tabs */}
                        {renderAiProviderTabs()}

                        {/* Queue Auto-Cleanup */}
                        <div className="pt-4 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                                <Trash2 size={15} className="text-rose-500" /> Queue Auto-Cleanup
                            </h3>
                            {renderInput('ai_queue_cleanup_days', 'Cleanup After (Days)', 'number', '30', 'AI processing queue auto-archive after N days')}
                        </div>
                    </div>
                );
            case 'EXAM': {
                const subjectDefaults = Object.keys(settings).filter(key => key.startsWith('subject_default_'));
                return (
                    <div className="space-y-5 max-w-2xl">
                        {renderInput('default_exam_duration', 'Default Duration (minutes)', 'number', '60')}
                        {renderInput('default_total_marks', 'Default Total Marks', 'number', '100')}
                        {renderInput('default_pass_percentage', 'Default Pass Percentage', 'number', '40')}
                        {renderToggle('auto_shuffle_questions', 'Auto Shuffle Questions', 'Randomize question order by default')}
                        {renderToggle('show_result_immediately', 'Show Results Immediately', 'Display results right after submission')}
                        {renderSelect('default_exam_type', 'Default Exam Type', [
                            { value: '', label: 'Select type...' },
                            { value: 'MCQ', label: 'MCQ Only' },
                            { value: 'CQ', label: 'Creative Questions' },
                            { value: 'MIXED', label: 'Mixed (MCQ + CQ)' },
                        ])}

                        {/* Subject Specific Layout Defaults List */}
                        <div className="pt-5 border-t border-slate-100">
                            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2 mb-3">
                                <FileText size={15} className="text-indigo-500" />
                                Subject Default Layouts
                            </h3>
                            <p className="text-xs text-slate-400 mb-4">
                                Below are the custom default layouts saved for specific subjects. Deleting them will revert the subject back to the system layout default.
                            </p>
                            
                            {subjectDefaults.length === 0 ? (
                                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-xs font-medium text-slate-400">No subject default layouts saved yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {subjectDefaults.map(key => {
                                        const subjectName = key.replace('subject_default_', '');
                                        return (
                                            <div key={key} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 capitalize">{subjectName}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">Key: {key}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm(`Are you sure you want to delete the default layout for "${subjectName}"?`)) {
                                                            setSettings(prev => {
                                                                const updated = { ...prev };
                                                                delete updated[key];
                                                                return updated;
                                                            });
                                                        }
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="Delete subject default"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                );
            }
            case 'STORAGE':
                return (
                    <div className="space-y-5 max-w-2xl">
                        {renderSelect('storage_provider', 'Storage Provider', [
                            { value: '', label: 'Select provider...' },
                            { value: 'LOCAL', label: 'Local Filesystem' },
                            { value: 'CLOUDFLARE_R2', label: 'Cloudflare R2' },
                            { value: 'AWS_S3', label: 'AWS S3' },
                            { value: 'CLOUDINARY', label: 'Cloudinary' },
                        ])}

                        {settings.storage_provider === 'CLOUDFLARE_R2' && (
                            <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-4">
                                <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2 mb-2">
                                    <Database size={16} /> Cloudflare R2 Configuration
                                </h3>
                                {renderInput('cloudflare_account_id', 'Account ID', 'text', 'e.g. a1682a88a...')}
                                {renderInput('cloudflare_r2_bucket', 'R2 Bucket Name', 'text', 'e.g. sl-checkout-invoice')}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {renderInput('storage_access_key', 'Access Key ID', 'password', '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')}
                                    {renderInput('storage_secret_key', 'Secret Access Key', 'password', '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')}
                                </div>
                                {renderInput('cloudflare_public_url', 'Public URL', 'url', 'e.g. https://pub-xyz.r2.dev')}
                                
                                <div className="pt-2 border-t border-blue-200 flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <button type="button" disabled={testingStorage}
                                            onClick={async () => {
                                                setTestingStorage(true);
                                                setStorageTestResult(null);
                                                try {
                                                    const res = await axios.post('/v1/settings/general/test-storage', settings);
                                                    setStorageTestResult(res.data);
                                                } catch (err) {
                                                    setStorageTestResult({ connected: false, error: err.response?.data?.error || err.message });
                                                } finally {
                                                    setTestingStorage(false);
                                                }
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-200 transition-all active:scale-[0.97] disabled:opacity-60 cursor-pointer">
                                            {testingStorage ? <Loader2 size={13} className="animate-spin" /> : <Wifi size={13} />}
                                            Test Bucket Connection
                                        </button>
                                    </div>
                                    
                                    {storageTestResult && (
                                        <div className={`p-3 rounded-xl border text-xs ${storageTestResult.connected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                            <div className="flex items-start gap-2">
                                                <div className="mt-0.5">{storageTestResult.connected ? '\u2705' : '\u274C'}</div>
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-bold">
                                                        {storageTestResult.connected ? 'Connected Successfully!' : 'Failed to Connect'}
                                                    </span>
                                                    {storageTestResult.connected ? (
                                                        <div className="flex flex-col text-emerald-600 mt-1">
                                                            <span><strong>Bucket:</strong> {storageTestResult.bucketName}</span>
                                                            <span><strong>Objects Sampled:</strong> {storageTestResult.objectCount}</span>
                                                            <span><strong>Est. Usage Volume:</strong> {storageTestResult.approxSize}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-rose-600">{storageTestResult.error}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {settings.storage_provider !== 'CLOUDFLARE_R2' && (
                            <>
                                {renderInput('storage_bucket', 'Bucket / Container Name', 'text', 'questionshaper-uploads')}
                                {renderInput('storage_region', 'Region', 'text', 'ap-southeast-1')}
                                {renderInput('storage_access_key', 'Access Key', 'password', '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')}
                                {renderInput('storage_secret_key', 'Secret Key', 'password', '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022')}
                            </>
                        )}
                        {renderInput('max_upload_size_mb', 'Max Upload Size (MB)', 'number', '10')}
                    </div>
                );
            default:
                return <div className="p-8 text-center text-slate-400 text-sm">Settings for {activeTab} coming soon...</div>;
        }
    };

    const activeTabData = TABS.find(t => t.id === activeTab);

    return (
        <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Settings size={24} className="text-primary" />
                        {t('title_settings') || 'General Settings'}
                    </h1>

                    <p className="text-xs md:text-sm text-slate-500 mt-0.5">{t('set_header_desc') || 'Configure your platform settings and preferences.'}</p>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors active:scale-[0.97]"
                        >
                            <RotateCcw size={14} />
                            {t('set_reset_btn') || 'Reset'}
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-secondary hover:brightness-110 disabled:from-slate-300 disabled:to-slate-400 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 disabled:shadow-none active:scale-[0.97]"
                    >

                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {t('set_save_btn') || 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Toast Message */}
            {message && (
                <div className={`px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium border animate-fade-in-up ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    message.type === 'info' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                    {message.type === 'success' ? <Check size={16} /> :
                        message.type === 'info' ? <RefreshCw size={16} /> :
                            <AlertTriangle size={16} />}
                    {message.text}
                </div>
            )}

            {/* Main Card */}
            <div className="flex flex-col md:flex-row bg-white rounded-2xl shadow-[0_1px_6px_rgba(0,0,0,0.04)] border border-slate-100 min-h-[500px] overflow-hidden">

                {/* ─── Tab Navigation ─── */}
                <div className="md:w-56 lg:w-64 border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/30 flex-shrink-0">
                    {/* Mobile: Horizontal tabs */}
                    <div className="md:hidden overflow-x-auto flex gap-1 p-2 custom-scrollbar">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.95] ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                                    : 'text-slate-500 bg-white border border-slate-100 hover:bg-slate-50'
                                    }`}

                            >
                                <tab.icon size={14} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Desktop: Vertical tabs */}
                    <div className="hidden md:block p-3 space-y-0.5">
                        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Categories</p>
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all group ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md shadow-primary/20'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                                    }`}

                            >
                                <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-primary'} />
                                <div className="flex-1 text-left">
                                    <span className="block">{tab.label}</span>
                                </div>
                                {activeTab === tab.id && <ChevronRight size={14} className="text-white/60" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Content Area ─── */}
                <div className="flex-1 p-4 md:p-6 lg:p-8">
                    {/* Section Header */}
                    <div className="mb-6 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            {activeTabData && <activeTabData.icon size={18} className="text-primary" />}
                            <h2 className="text-base md:text-lg font-bold text-slate-900">{activeTabData?.label || 'Settings'}</h2>
                        </div>

                        <p className="text-xs text-slate-400 mt-1">{activeTabData?.description}</p>
                        <span className={`inline-block mt-2 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg ${settingsScope === 'global' ? 'bg-secondary text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                            {settingsScope === 'global' ? `\uD83C\uDF0D ${t('set_scope_global') || 'Global Settings (Super Admin Only)'}` : `\uD83C\uDFEB ${t('set_scope_institute') || 'Institute Settings Mode'}`}
                        </span>

                    </div>

                    {/* Form Content */}
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
