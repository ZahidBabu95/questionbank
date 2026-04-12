import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../utils/axios';

const BrandingContext = createContext(null);

export const BrandingProvider = ({ children }) => {
    const [branding, setBranding] = useState({
        system_name: 'QuestionShaper',
        logo_url: null,
        favicon_url: null,
        footer_text: '© 2026 QuestionShaper Inc. All rights reserved.',
        primary_color: '#3b82f6',
        secondary_color: '#6366f1'
    });

    const fetchBranding = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = token ? '/v1/settings/general/institute/BRANDING' : '/v1/public/branding';
            const res = await axios.get(url);
            let data = res.data;

            // If we're using the institute endpoint, backend returns a map directly
            // Public endpoint also returns a map directly now after my previous backend change.

            if (data && typeof data === 'object') {
                // Normalize keys to lowercase
                data = Object.keys(data).reduce((acc, key) => {
                    acc[key.toLowerCase()] = data[key];
                    return acc;
                }, {});

                if (data.primary_color) document.documentElement.style.setProperty('--primary-color', data.primary_color);
                if (data.secondary_color) document.documentElement.style.setProperty('--secondary-color', data.secondary_color);
                if (data.system_name) document.title = data.system_name;

                if (data.favicon_url) {
                    let link = document.querySelector("link[rel~='icon']");
                    if (!link) {
                        link = document.createElement('link');
                        link.rel = 'icon';
                        document.getElementsByTagName('head')[0].appendChild(link);
                    }
                    link.href = data.favicon_url;
                }

                setBranding(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error("Failed to load branding", err);
        }
    };


    useEffect(() => {
        fetchBranding();
    }, []);

    return (
        <BrandingContext.Provider value={{ ...branding, refreshBranding: fetchBranding }}>
            {children}
        </BrandingContext.Provider>
    );
};


export const useBranding = () => useContext(BrandingContext);
