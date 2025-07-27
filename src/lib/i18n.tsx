
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
  const [locale, setLocale] = useState<Locale>('es');

  useEffect(() => {
    const userLanguage = navigator.language.toLowerCase();
    if (userLanguage.startsWith('pt')) {
      setLocale('pt');
    } else {
      setLocale('es');
    }
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string>) => {
    const translation = getNestedValue(translations[locale], key) || getNestedValue(translations['es'], key) || key;

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
