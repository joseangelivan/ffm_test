
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
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // For logged-in users, the server-provided `initialLocale` from DB is correct.
    // For public pages, we can check localStorage for a user's previous manual selection.
    if (initialLocale === 'pt-BR') { // A good indicator we are on a public page or user has no setting
        const storedLocale = localStorage.getItem('locale') as Locale;
        if (storedLocale && (storedLocale === 'es' || storedLocale === 'pt-BR')) {
             setLocaleState(storedLocale);
        }
    } else {
        setLocaleState(initialLocale);
    }
  }, [initialLocale]);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    // If we're on a public page, we save the preference to localStorage.
    // A more robust check might involve knowing if a session is active.
    // For simplicity, we can check if the initialLocale from the server was the default.
    if (typeof window !== 'undefined') {
        localStorage.setItem('locale', newLocale);
    }
  }


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
