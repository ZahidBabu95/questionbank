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

  // Fallback to system locale
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const languageCode = locales[0].languageCode;
    if (languageCode === 'bn') {
      return 'bn';
    }
  }
  return 'en'; // default fallback
};

const initI18n = async () => {
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
};

initI18n();

export default i18n;
