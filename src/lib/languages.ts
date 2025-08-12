
export type LanguageCatalog = {
    [key: string]: {
        es: string;
        pt: string;
    };
};

export const supportedLanguages: LanguageCatalog = {
    'en': { es: 'Inglés', pt: 'Inglês' },
    'es': { es: 'Español', pt: 'Espanhol' },
    'fr': { es: 'Francés', pt: 'Francês' },
    'de': { es: 'Alemán', pt: 'Alemão' },
    'it': { es: 'Italiano', pt: 'Italiano' },
    'pt': { es: 'Portugués', pt: 'Português' },
    'pt-BR': { es: 'Portugués (Brasil)', pt: 'Português (Brasil)' },
    'ru': { es: 'Ruso', pt: 'Russo' },
    'zh': { es: 'Chino', pt: 'Chinês' },
    'ja': { es: 'Japonés', pt: 'Japonês' },
    'ko': { es: 'Coreano', pt: 'Coreano' },
    'ar': { es: 'Árabe', pt: 'Árabe' },
    'hi': { es: 'Hindi', pt: 'Híndi' },
    'bn': { es: 'Bengalí', pt: 'Bengali' },
    'nl': { es: 'Holandés', pt: 'Holandês' },
    'sv': { es: 'Sueco', pt: 'Sueco' },
    'fi': { es: 'Finlandés', pt: 'Finlandês' },
    'da': { es: 'Danés', pt: 'Dinamarquês' },
    'pl': { es: 'Polaco', pt: 'Polonês' },
    'uk': { es: 'Ucraniano', pt: 'Ucraniano' },
    'tr': { es: 'Turco', pt: 'Turco' },
    'el': { es: 'Griego', pt: 'Grego' },
    'he': { es: 'Hebreo', pt: 'Hebraico' },
    'th': { es: 'Tailandés', pt: 'Tailandês' },
    'vi': { es: 'Vietnamita', pt: 'Vietnamita' },
    'cs': { es: 'Checo', pt: 'Tcheco' },
    'hu': { es: 'Húngaro', pt: 'Húngaro' },
    'ro': { es: 'Rumano', pt: 'Romeno' },
    'id': { es: 'Indonesio', pt: 'Indonésio' }
};
