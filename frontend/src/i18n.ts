import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en/translation.json';
import viTranslation from './locales/vi/translation.json';

const resources = {
  en: {
    translation: enTranslation
  },
  vi: {
    translation: viTranslation
  }
};

i18n
  .use(LanguageDetector) // Tự động detect ngôn ngữ từ browser
  .use(initReactI18next) // Kết nối với React
  .init({
    resources,
    fallbackLng: 'vi', // Ngôn ngữ mặc định
    lng: 'vi', // Ngôn ngữ khởi đầu
    debug: false,
    
    interpolation: {
      escapeValue: false // React đã escape rồi
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
