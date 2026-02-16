import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Globe, Image, Mail, Cpu, FileText, Database, Shield, Check } from 'lucide-react';
import settingsService from '../../../services/settingsService';

import { useLocation, useNavigate } from 'react-router-dom';

const GeneralSettings = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const getInitialTab = () => {
        const path = location.pathname;
        if (path.includes('/settings/branding')) return 'BRANDING';
        if (path.includes('/settings/communication')) return 'COMMUNICATION';
        // Add other checks if needed, or default to GENERAL
        return 'GENERAL';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({});
    const [message, setMessage] = useState(null);

    const TABS = [
        { id: 'GENERAL', label: 'General', icon: Globe },
        { id: 'BRANDING', label: 'Branding', icon: Image },
        { id: 'COMMUNICATION', label: 'Communication', icon: Mail },
        { id: 'AI', label: 'AI Configuration', icon: Cpu },
        { id: 'EXAM', label: 'Exam Defaults', icon: FileText },
        { id: 'STORAGE', label: 'Storage', icon: Database },
        { id: 'EXAM', label: 'Exam Defaults', icon: FileText },
        { id: 'STORAGE', label: 'Storage', icon: Database },
    ];

    useEffect(() => {
        fetchSettings();
    }, [activeTab]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            // Determine if we are Super Admin or Institute Admin to call appropriate endpoint.
            // For MVP simplicity, let's try Institute first, if 403/error, try Global?
            // Or better, check role from token.
            // Assuming current user context is handled by backend logic (Controller checks role).
            // But we need to know which endpoint to call: /global or /institute.

            // Let's assume we are calling Institute settings for now as it's the more common use case for tenants.
            // If the user is Super Admin, they might want to toggle between Global and Institute contexts.
            // For now, let's try to fetch Institute settings. If it fails (e.g. user is Super Admin without institute),
            // maybe we fallback or have a UI toggle.

            // Checking local storage for role hack (not secure but practical for UI logic)
            const token = localStorage.getItem('token');
            // Parse token or just try one.

            // Let's rely on a heuristic: Try Global if Super Admin, Institute otherwise.
            // Since we don't have a robust "UserContext" in frontend yet, we might need to try/catch.

            try {
                const data = await settingsService.getInstituteSettings(activeTab);
                setSettings(data);
            } catch (err) {
                // If 403 or specific error, maybe try global?
                // Or maybe the user IS Super Admin and wants Global.
                const globalData = await settingsService.getGlobalSettings(activeTab);
                setSettings(globalData);
            }

        } catch (error) {
            console.error("Error fetching settings:", error);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // Same logic for save. Try Institute, fallback to Global?
            // This is ambiguous. We should probably have a clear "Edit Global" vs "Edit Institute" mode.
            // For this MVP, let's assume if we fetched successfully from one, we save to that one.
            // But we don't know which one we fetched from above easily without state.

            // Let's try updateInstitute first.
            try {
                await settingsService.updateInstituteSettings(activeTab, settings);
                setMessage({ type: 'success', text: 'Institute settings saved successfully.' });
            } catch (err) {
                await settingsService.updateGlobalSettings(activeTab, settings);
                setMessage({ type: 'success', text: 'Global settings saved successfully.' });
            }

        } catch (error) {
            console.error("Error saving settings:", error);
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const renderInput = (key, label, type = "text", placeholder = "") => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
                type={type}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                value={settings[key] || ''}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );

    const renderToggle = (key, label) => (
        <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <button
                onClick={() => handleChange(key, settings[key] === 'true' ? 'false' : 'true')}
                className={`w-11 h-6 flex items-center rounded-full transition-colors duration-200 focus:outline-none ${settings[key] === 'true' ? 'bg-blue-600' : 'bg-slate-200'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${settings[key] === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );

    const renderTabContent = () => {
        if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading settings...</div>;

        switch (activeTab) {
            case 'GENERAL':
                return (
                    <div className="space-y-4 max-w-2xl">
                        {renderInput('system_name', 'System Name', 'text', 'QuestionShaper')}
                        {renderInput('default_language', 'Default Language', 'text', 'English')}
                        {renderInput('default_timezone', 'Timezone', 'text', 'UTC+6')}
                        {renderToggle('maintenance_mode', 'Maintenance Mode')}
                        {renderToggle('allow_registration', 'Allow Public Registration')}
                    </div>
                );
            case 'BRANDING':
                return (
                    <div className="space-y-4 max-w-2xl">
                        {renderInput('primary_color', 'Primary Color', 'color')}
                        {renderInput('secondary_color', 'Secondary Color', 'color')}
                        {renderInput('logo_url', 'Logo URL')}
                        {renderInput('footer_text', 'Footer Text')}
                    </div>
                );
            case 'COMMUNICATION':
                return (
                    <div className="space-y-4 max-w-2xl">
                        {renderInput('smtp_host', 'SMTP Host')}
                        {renderInput('smtp_port', 'SMTP Port', 'number')}
                        {renderInput('smtp_username', 'SMTP Username')}
                        {renderInput('smtp_password', 'SMTP Password', 'password')}
                    </div>
                );
            case 'AI':
                return (
                    <div className="space-y-4 max-w-2xl">
                        {renderToggle('ai_enabled', 'Enable AI Features')}
                        {renderInput('ai_provider', 'AI Provider', 'text', 'OpenAI')}
                        {renderInput('ai_api_key', 'API Key', 'password')}
                        {renderInput('ai_model', 'Model Name', 'text', 'gpt-4o')}
                    </div>
                );
            default:
                return <div className="p-4 text-slate-500">Settings for {activeTab} coming soon...</div>;
        }
    };

    return (
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px]">
            {/* Sidebar Tabs */}
            <div className="w-64 border-r border-slate-200 bg-slate-50/50 p-4">
                <h2 className="text-lg font-bold text-slate-800 mb-6 px-2">Settings</h2>
                <nav className="space-y-1">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                // Optional: Update URL without reload to allow bookmarking
                                if (tab.id === 'GENERAL') navigate('/settings/general');
                                // Keep others on current path or define specific paths
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{TABS.find(t => t.id === activeTab)?.label}</h1>
                        <p className="text-slate-500 mt-1">Manage system configurations</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70 shadow-lg shadow-blue-500/20"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                        Save Changes
                    </button>
                </div>

                {message && (
                    <div className={`mb-6 px-4 py-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {message.type === 'success' ? <Check size={18} /> : <Shield size={18} />}
                        {message.text}
                    </div>
                )}

                <div className="bg-white">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default GeneralSettings;
