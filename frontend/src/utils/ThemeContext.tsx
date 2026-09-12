import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'teal' | 'dark' | 'contrast' | 'indigo' | 'amber';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  accentColor: string;
  previewBg: string;
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  {
    id: 'teal',
    name: 'Medical Teal',
    description: 'Clinical standard balanced theme with emerald & surgical teal',
    accentColor: '#0d9488',
    previewBg: '#f8fafc',
  },
  {
    id: 'dark',
    name: 'Ophthalmology Darkroom',
    description: 'Anti-glare obsidian dark mode for dark retinal exam rooms',
    accentColor: '#14b8a6',
    previewBg: '#0b0f19',
  },
  {
    id: 'contrast',
    name: 'High Contrast Sunlight',
    description: 'Ultra-bold high-visibility theme for outdoor rural vision camps',
    accentColor: '#000000',
    previewBg: '#ffffff',
  },
  {
    id: 'indigo',
    name: 'Ayush Royal Indigo',
    description: 'Modern diagnostic center aesthetic with vibrant indigo accents',
    accentColor: '#6366f1',
    previewBg: '#f5f3ff',
  },
  {
    id: 'amber',
    name: 'Warm Amber Health',
    description: 'Low blue-light soothing warm amber palette for reduced eye strain',
    accentColor: '#d97706',
    previewBg: '#fffbeb',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'teal',
  setTheme: () => {},
  themes: AVAILABLE_THEMES,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('retinal_theme') as ThemeId;
    return (saved && AVAILABLE_THEMES.some(t => t.id === saved)) ? saved : 'teal';
  });

  useEffect(() => {
    // Apply theme to document body and root
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
    localStorage.setItem('retinal_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  return React.createElement(
    ThemeContext.Provider,
    {
      value: {
        theme,
        setTheme,
        themes: AVAILABLE_THEMES,
      }
    },
    children
  );
};

export const useTheme = () => useContext(ThemeContext);
