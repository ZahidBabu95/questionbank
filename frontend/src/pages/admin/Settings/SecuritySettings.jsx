import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Shield, Check } from 'lucide-react';
import settingsService from '../../../services/settingsService';

const SecuritySettings = () => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({});
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            try {
                const data = await settingsService.getInstituteSecuritySettings();
                setSettings(data);
            } catch (err) {
                const globalData = await settingsService.getGlobalSecuritySettings();
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
            try {
                await settingsService.updateInstituteSecuritySettings(settings);
                setMessage({ type: 'success', text: 'Institute security settings saved.' });
            } catch (err) {
                await settingsService.updateGlobalSecuritySettings(settings);
                setMessage({ type: 'success', text: 'Global security settings saved.' });
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

    if (loading) {
        return (
            <div className="p-8 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex items-center justify-center">
                <div className="text-slate-500 animate-pulse flex items-center gap-2">
                    <RefreshCw className="animate-spin" size={20} />
                    Loading security settings...
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <Shield size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Security Settings</h1>
                        <p className="text-slate-500 mt-1">Manage password policies, login protection, and tokens</p>
                    </div>
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
                <div className={`mb-8 px-4 py-3 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                    {message.type === 'success' ? <Check size={18} /> : <Shield size={18} />}
                    {message.text}
                </div>
            )}

            <div className="max-w-3xl space-y-8">
                {/* Password Policy */}
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield size={18} className="text-slate-400" />
                        Password Policy
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInput('PASSWORD_MIN_LENGTH', 'Minimum Length', 'number', '8')}
                        {renderToggle('PASSWORD_REQUIRE_UPPERCASE', 'Require Uppercase Letter')}
                        {renderToggle('PASSWORD_REQUIRE_LOWERCASE', 'Require Lowercase Letter')}
                        {renderToggle('PASSWORD_REQUIRE_NUMBER', 'Require Number')}
                        {renderToggle('PASSWORD_REQUIRE_SPECIAL', 'Require Special Character')}
                    </div>
                </div>

                {/* Login Protection */}
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield size={18} className="text-slate-400" />
                        Login Protection
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInput('MAX_LOGIN_ATTEMPTS', 'Max Login Attempts', 'number', '5')}
                        {renderInput('ACCOUNT_LOCK_DURATION_MINUTES', 'Lock Duration (Minutes)', 'number', '15')}
                    </div>
                </div>

                {/* JWT Configuration */}
                <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-200/60">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <Shield size={18} className="text-slate-400" />
                        Session & Token Configuration (JWT)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderInput('JWT_ACCESS_TOKEN_EXPIRY_MINUTES', 'Access Token Expiry (Minutes)', 'number', '60')}
                        {renderInput('JWT_REFRESH_TOKEN_EXPIRY_DAYS', 'Refresh Token Expiry (Days)', 'number', '30')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettings;
