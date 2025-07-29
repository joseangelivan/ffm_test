
"use client";

import React, { createContext, useState, useContext, useCallback } from 'react';
import es from '../locales/es.json';
import pt from '../locales/pt.json';

type Locale = 'es' | 'pt';
type Translations = typeof es;

const translations: Record<Locale, Translations> = {
  es,
  pt,
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Function to get the initial locale, safe for SSR
const getInitialLocale = (): Locale => {
  if (typeof window !== 'undefined' && navigator.language) {
    const userLanguage = navigator.language.toLowerCase();
    if (userLanguage.startsWith('es')) {
      return 'es';
    }
  }
  // Default to 'pt' on the server or if language is not 'es'
  return 'pt';
};

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  const t = useCallback((key: string, replacements?: Record<string, string>) => {
    const translation = getNestedValue(translations[locale], key) || getNestedValue(translations['pt'], key) || key;

    if (replacements) {
        return Object.entries(replacements).reduce((acc, [k, v]) => {
            return acc.replace(`{${k}}`, v);
        }, translation);
    }
    
    return translation;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
