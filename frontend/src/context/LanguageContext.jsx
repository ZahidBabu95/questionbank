import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../utils/translations';
import settingsService from '../services/settingsService';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
    const [currentLang, setCurrentLang] = useState('en');
    const [loading, setLoading] = useState(true);

    const loadLanguageSetting = async () => {
        try {
            // 1. Check local storage override first
            const storedLang = localStorage.getItem('user-language');
            if (storedLang === 'en' || storedLang === 'bn') {
                setCurrentLang(storedLang);
                setLoading(false);
                return;
            }

            // 2. Fallback to general settings from backend database
            const token = localStorage.getItem('token');
            if (token) {
                const data = await settingsService.getInstituteSettings('GENERAL');
                if (data) {
                    // Keys are normalized to lowercase by settingsService
                    const defLang = data.default_language || data.default_language_option;
                    if (defLang) {
                        const mappedLang = (defLang.toLowerCase().includes('bengali') || defLang.toLowerCase() === 'bn') ? 'bn' : 'en';
                        setCurrentLang(mappedLang);
                        setLoading(false);
                        return;
                    }
                }
            }
        } catch (err) {
            console.warn("Failed to retrieve system default language setting, falling back to 'en':", err);
        }
        
        // Final fallback: default is English
        setCurrentLang('en');
        setLoading(false);
    };

    useEffect(() => {
        loadLanguageSetting();
    }, []);

    const changeLanguage = (langCode) => {
        if (langCode === 'en' || langCode === 'bn') {
            setCurrentLang(langCode);
            localStorage.setItem('user-language', langCode);
        }
    };

    const t = (key) => {
        if (!key) return '';
        
        // Find match in current language dictionary
        if (translations[currentLang]?.[key] !== undefined) {
            return translations[currentLang][key];
        }
        
        // Fallback to English dictionary
        if (translations.en?.[key] !== undefined) {
            return translations.en[key];
        }
        
        // Return raw key if no match found
        return key;
    };

    return (
        <LanguageContext.Provider value={{ currentLang, t, changeLanguage, loading, refreshLanguage: loadLanguageSetting }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
