import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

export interface BrandingData {
  systemName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  footerText: string;
  primaryColor: string;
  secondaryColor: string;
}

interface BrandingContextType extends BrandingData {
  refreshBranding: () => Promise<void>;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

const DEFAULT_BRANDING: BrandingData = {
  systemName: 'QuestionShaper',
  logoUrl: null,
  faviconUrl: null,
  footerText: '© 2026 QuestionShaper Inc. All rights reserved.',
  primaryColor: '#2563EB', // blue-600
  secondaryColor: '#4F46E5', // indigo-600
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      setIsLoading(true);
      const { data } = await apiClient.get('/public/branding');
      
      if (data && typeof data === 'object') {
        // Normalize keys to camelCase / expected format
        const logoUrl = data.logo_url || data.LOGO_URL || null;
        const faviconUrl = data.favicon_url || data.FAVICON_URL || null;
        const systemName = data.system_name || data.SYSTEM_NAME || 'QuestionShaper';
        const footerText = data.footer_text || data.FOOTER_TEXT || DEFAULT_BRANDING.footerText;
        const primaryColor = data.primary_color || data.PRIMARY_COLOR || DEFAULT_BRANDING.primaryColor;
        const secondaryColor = data.secondary_color || data.SECONDARY_COLOR || DEFAULT_BRANDING.secondaryColor;

        setBranding({
          systemName,
          logoUrl,
          faviconUrl,
          footerText,
          primaryColor,
          secondaryColor,
        });
      }
    } catch (err) {
      console.log('Failed to load branding, using default fallbacks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ ...branding, refreshBranding: fetchBranding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};
