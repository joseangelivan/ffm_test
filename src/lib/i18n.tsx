
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
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[keys[i]];
  }
  return current;
}


export const LocaleProvider: React.FC<{ children: React.ReactNode, initialLocale: Locale }> = ({ children, initialLocale }) => {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    if (initialLocale) {
      setLocaleState(initialLocale);
    } else {
        const storedLocale = localStorage.getItem('locale') as Locale;
        if (storedLocale && (storedLocale === 'es' || storedLocale === 'pt-BR')) {
             setLocaleState(storedLocale);
        }
    }
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
        localStorage.setItem('locale', newLocale);
    }
  }


  const t = useCallback((key: string, replacements?: Record<string, string>) => {
    const primaryTranslation = getNestedValue(translations[locale], key);
    // Fallback to pt-BR if spanish is selected but translation is missing
    const fallbackTranslation = locale === 'es' 
        ? getNestedValue(translations['pt-BR'], key)
        : undefined;

    const translation = primaryTranslation || fallbackTranslation || key;

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
