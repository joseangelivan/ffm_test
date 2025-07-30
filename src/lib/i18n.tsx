
"use client";

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
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

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Always default to 'pt' on initial render for both server and client to avoid hydration mismatch.
  const [locale, setLocale] = useState<Locale>('pt');

  useEffect(() => {
    // This effect runs only on the client, after the initial render.
    if (typeof window !== 'undefined' && navigator.language) {
      const userLanguage = navigator.language.toLowerCase();
      if (userLanguage.startsWith('es')) {
        setLocale('es');
      }
    }
  }, []);

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
