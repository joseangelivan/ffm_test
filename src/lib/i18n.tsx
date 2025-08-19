
"use client";

import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import es from '../locales/es.json';
import ptBR from '../locales/pt-BR.json';

type Locale = 'es' | 'pt-BR';
type Translations = typeof es;

const translations: Record<Locale, Translations> = {
  es,
  'pt-BR': ptBR,
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

export const LocaleProvider: React.FC<{ children: React.ReactNode, initialLocale: Locale }> = ({ children, initialLocale }) => {
  const [locale, setLocale] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Set the initial locale from server props. 
    // No need for browser detection anymore if we get it from the server.
    setLocale(initialLocale);
  }, [initialLocale]);

  const t = useCallback((key: string, replacements?: Record<string, string>) => {
    const translation = getNestedValue(translations[locale], key) || getNestedValue(translations['pt-BR'], key) || key;

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
