import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import bn from '../locales/bn.json';

const resources = {
  en: { translation: en },
  bn: { translation: bn },
};

const getLocale = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('user-language');
    if (savedLanguage) {
      return savedLanguage;
    }
  } catch (error) {
    console.log('Error reading language from AsyncStorage:', error);
  }

  // Safe fallback to system locale
  try {
    if (Localization && typeof Localization.getLocales === 'function') {
      const locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        const languageCode = locales[0]?.languageCode;
        if (languageCode === 'bn') {
          return 'bn';
        }
      }
    }
  } catch (e) {
    console.log('Error getting system locale:', e);
  }
  return 'en'; // default fallback
};

const initI18n = async () => {
  try {
    const locale = await getLocale();
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng: locale,
        fallbackLng: 'en',
        compatibilityJSON: 'v4', // Required for React Native compatibility
        interpolation: {
          escapeValue: false, // React already safes from XSS
        },
      });
  } catch (error) {
    console.error('Failed to initialize i18n:', error);
    // Safe fallback to prevent startup crash
    try {
      await i18n
        .use(initReactI18next)
        .init({
          resources,
          lng: 'en',
          fallbackLng: 'en',
          compatibilityJSON: 'v4',
          interpolation: {
            escapeValue: false,
          },
        });
    } catch (e) {}
  }
};

initI18n();

export default i18n;
