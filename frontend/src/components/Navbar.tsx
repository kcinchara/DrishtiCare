import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Wifi, WifiOff, RefreshCw, UserCheck, ShieldAlert,
  History, Settings, LogOut, Home, HardDrive, Globe, Palette, Check,
  Hospital, Stethoscope, PlusCircle, Menu, X
} from 'lucide-react';
import { DrishtiCareLogo } from './DrishtiCareLogo';
import { useSync } from '../hooks/useSync';
import { api } from '../services/api';
import { useLanguage, LanguageCode } from '../utils/i18n';
import { useTheme, ThemeId } from '../utils/ThemeContext';
import { formatUserGreeting } from '../utils/userUtils';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, currentLanguage, setLanguage, languages } = useLanguage();
  const { theme, setTheme, themes } = useTheme();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const {
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    isSyncing,
    pendingCount,
    syncToast,
    triggerSync
  } = useSync();

  const user = api.getCurrentUser();
  const role = (user?.role || '').toUpperCase();

  const handleLogout = () => {
    api.logout();
    navigate('/login');
  };

  // Close dropdowns on outside click and route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = role === 'DOCTOR' ? [
    { label: 'Priority Queue', path: '/dashboard', icon: Stethoscope },
    { label: 'Nearby Hospitals', path: '/nearby-hospitals', icon: Hospital },
    { label: t('nav.history', 'Patient History'), path: '/history', icon: History },
    { label: t('nav.settings', 'Model Info & Settings'), path: '/settings', icon: Settings },
  ] : role === 'ADMIN' ? [
    { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: Home },
    { label: 'User Directory', path: '/admin', icon: ShieldAlert },
    { label: 'Nearby Hospitals', path: '/nearby-hospitals', icon: Hospital },
    { label: t('nav.settings', 'Model Info & Settings'), path: '/settings', icon: Settings },
  ] : [
    { label: t('nav.dashboard', 'Dashboard'), path: '/dashboard', icon: Home },
    { label: 'New Patient', path: '/patient/new', icon: PlusCircle },
    { label: 'Nearby Hospitals', path: '/nearby-hospitals', icon: Hospital },
    { label: t('nav.history', 'Patient History'), path: '/history', icon: History },
    { label: t('nav.offlineSync', 'Offline Sync'), path: '/offline', icon: HardDrive },
    { label: t('nav.settings', 'Model Info & Settings'), path: '/settings', icon: Settings },
  ];

  const currentLangInfo = languages.find(l => l.code === currentLanguage) || languages[0];
  const currentThemeInfo = themes.find(t => t.id === theme) || themes[0];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm transition-colors duration-200">
      {/* Toast Notification for Sync status */}
      {syncToast && (
        <div className={`px-4 py-2 text-xs font-semibold text-center transition-all ${
          syncToast.includes('Complete')
            ? 'bg-emerald-600 text-white'
            : (syncToast.includes('failed') ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white')
        }`}>
          {syncToast}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform p-1">
              <DrishtiCareLogo size={28} variant="white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight truncate max-w-[140px] sm:max-w-none">
                  {t('app.title', 'DrishtiCare')}
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  {t('app.edition', 'Clinical Edition')}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                {t('app.subtitle', 'Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare')}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Controls: Language, Theme, Status, and User */}
          <div className="flex items-center gap-2.5">
            {/* Language Selector Dropdown */}
            <div className="relative" ref={langRef}>
              <button
                type="button"
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors"
                title="Change Language"
              >
                <span className="text-sm">{currentLangInfo.flag}</span>
                <span className="hidden sm:inline font-medium">{currentLangInfo.nativeLabel}</span>
                <Globe className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                    Select Language / भाषा
                  </div>
                  {languages.map((lang) => {
                    const isSelected = lang.code === currentLanguage;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setIsLangOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-teal-50 transition-colors ${
                          isSelected ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{lang.flag}</span>
                          <div>
                            <div className="font-semibold">{lang.nativeLabel}</div>
                            <div className="text-[10px] text-slate-400">{lang.label}</div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theme Selector Dropdown */}
            <div className="relative" ref={themeRef}>
              <button
                type="button"
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-sm transition-colors"
                title="Select Visual Theme"
              >
                <Palette className="w-3.5 h-3.5 text-teal-600" />
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                  style={{ backgroundColor: currentThemeInfo.accentColor }}
                />
              </button>

              {isThemeOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                    {t('theme.title', 'Color Theme')}
                  </div>
                  {themes.map((tOpt) => {
                    const isSelected = tOpt.id === theme;
                    return (
                      <button
                        key={tOpt.id}
                        onClick={() => {
                          setTheme(tOpt.id);
                          setIsThemeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-slate-100 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-slate-400 flex-shrink-0"
                            style={{ backgroundColor: tOpt.accentColor }}
                          />
                          <div>
                            <div className="font-semibold">{tOpt.name}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {tOpt.description}
                            </div>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real-time Connectivity Status Badge */}
            <div className="flex items-center">
              {isSyncing ? (
                <div className="badge-warning animate-pulse cursor-pointer" onClick={triggerSync}>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('nav.syncing', 'Syncing...')}</span>
                </div>
              ) : isOnline ? (
                <div
                  className="badge-success cursor-pointer hover:bg-emerald-100 transition-colors"
                  onClick={toggleSimulatedOffline}
                  title="Click to simulate offline mode"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="font-semibold">{t('nav.online', 'Online')}</span>
                </div>
              ) : (
                <div
                  className="badge-danger cursor-pointer hover:bg-rose-100 transition-colors"
                  onClick={toggleSimulatedOffline}
                  title="Click to reconnect"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="font-semibold">{t('nav.offline', 'Offline Mode')}</span>
                  {pendingCount > 0 && (
                    <span className="ml-1 bg-rose-200 text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Trigger Sync Button if records are pending */}
            {pendingCount > 0 && isOnline && !isSyncing && (
              <button
                onClick={triggerSync}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm"
              >
                <RefreshCw className="w-3 h-3" />
                {t('nav.sync', 'Sync')} ({pendingCount})
              </button>
            )}

            {/* User Profile / Role Badge */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900">{formatUserGreeting(user).greeting}</div>
                  <div className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider">
                    Role: {formatUserGreeting(user).role}
                  </div>
                </div>
                <div
                  className="w-8 h-8 rounded-full bg-teal-50 border-2 border-teal-500/40 text-teal-800 flex items-center justify-center font-bold text-xs shadow-xs"
                  title={`Role: ${formatUserGreeting(user).role}`}
                >
                  {formatUserGreeting(user).role === 'Doctor' ? 'MD' : (formatUserGreeting(user).role === 'ASHA Worker' ? 'AW' : 'HW')}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors hidden sm:block"
                  title={t('auth.logout', 'Sign Out')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-xs py-1.5 px-3">
                {t('auth.login', 'Sign In')}
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-teal-700 hover:bg-slate-100 transition-colors focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-5 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
          {/* User info on mobile */}
          {user && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-teal-50 border-2 border-teal-500/40 text-teal-800 flex items-center justify-center font-bold text-xs">
                  {formatUserGreeting(user).role === 'Doctor' ? 'MD' : (formatUserGreeting(user).role === 'ASHA Worker' ? 'AW' : 'HW')}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{formatUserGreeting(user).greeting}</div>
                  <div className="text-[10px] font-semibold text-teal-700 uppercase">
                    Role: {formatUserGreeting(user).role}
                  </div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* Navigation Links for Mobile */}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-teal-600" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
};
