import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Shield, User, Lock, Stethoscope, AlertCircle,
  ArrowRight, Sparkles, Activity, CheckCircle2, ChevronRight,
  HardDrive, Cpu, HeartPulse, ArrowLeft, Play, Pause, Volume2, VolumeX,
  Crosshair, Radio, Info, Layers, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { sound } from '../utils/audio';
import { useLanguage } from '../utils/i18n';
import { useTheme } from '../utils/ThemeContext';
import { Globe, Palette, Check } from 'lucide-react';
import { DrishtiCareLogo } from '../components/DrishtiCareLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, currentLanguage, setLanguage, languages } = useLanguage();
  const { theme, setTheme, themes } = useTheme();

  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Mode: 'welcome' (interactive splash/scanner) | 'login' (authentication form) | 'register' (registration form)
  const [viewMode, setViewMode] = useState<'welcome' | 'login' | 'register'>('welcome');

  // Welcome auto-countdown timer (seconds)
  const [countdown, setCountdown] = useState<number>(8);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Interactive scanner state
  const [activeBeacon, setActiveBeacon] = useState<{
    id: string;
    title: string;
    type: string;
    desc: string;
    x: number;
    y: number;
  } | null>(null);

  // Login Form states (Email ID / Username supported)
  const [identifier, setIdentifier] = useState('demo');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Registration Form states
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'Doctor' | 'ASHA Worker' | 'Hospital Worker / Healthcare Worker'>('Doctor');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Interactive beacons on the simulated retinal scanner
  const scannerBeacons = [
    {
      id: 'ma-1',
      title: 'Microaneurysm Cluster',
      type: 'Capillary Lesion',
      desc: 'Localized saccular outpouchings along superior temporal arcade. Early indicator of microvascular leakage.',
      x: 35,
      y: 40,
      color: 'bg-rose-500 ring-rose-400'
    },
    {
      id: 'he-1',
      title: 'Hard Exudates (Lipids)',
      type: 'Lipoprotein Deposit',
      desc: 'Waxy yellow lesions located 1.2 disc diameters from fovea. Evaluated for Macular Edema risk.',
      x: 62,
      y: 55,
      color: 'bg-amber-400 ring-amber-300'
    },
    {
      id: 'vessel-1',
      title: 'Venous Caliber Check',
      type: 'DRIVE Model',
      desc: 'Retinal vascular segmentation verified. Caliber ratio 0.68 within normal limits.',
      x: 50,
      y: 25,
      color: 'bg-cyan-400 ring-cyan-300'
    },
    {
      id: 'disc-1',
      title: 'Optic Disc Landmark',
      type: 'Reference Center',
      desc: 'Sharp margins identified. Field of View centration scored at 94% diagnostic quality.',
      x: 25,
      y: 52,
      color: 'bg-emerald-400 ring-emerald-300'
    }
  ];

  // Countdown effect on the welcome view
  useEffect(() => {
    if (viewMode !== 'welcome' || isPaused) return;

    if (countdown <= 0) {
      sound.playChime();
      setViewMode('login');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [viewMode, countdown, isPaused]);

  const toggleSound = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!identifier.trim()) {
      setError('Please enter your Email ID or Username.');
      return;
    }
    if (!password) {
      setError('Please enter your Password.');
      return;
    }

    setIsLoading(true);
    sound.playClick();

    try {
      await api.login(identifier, password);
      sound.playChime();
      navigate('/dashboard');
    } catch (err: any) {
      sound.playAlert();
      setError(err.message || 'Invalid Email ID / Username or Password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!regFullName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@') || !regEmail.includes('.')) {
      setError('Please provide a valid Email ID (e.g. name@clinic.org).');
      return;
    }
    if (!regUsername.trim() || regUsername.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!regPassword || regPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Confirm Password does not match Password.');
      return;
    }
    if (!regRole) {
      setError('Please select a healthcare role.');
      return;
    }

    setIsLoading(true);
    sound.playClick();

    try {
      await api.register({
        full_name: regFullName,
        email: regEmail,
        username: regUsername,
        password: regPassword,
        role: regRole
      });
      sound.playChime();
      navigate('/dashboard');
    } catch (err: any) {
      sound.playAlert();
      setError(err.message || 'Registration failed. Please check your inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectPersonaAndFill = (persona: 'doctor' | 'asha' | 'hw') => {
    sound.playClick();
    setError(null);
    setSuccessMsg(null);
    if (persona === 'doctor') {
      setIdentifier('doctor');
      setPassword('doctor123');
    } else if (persona === 'asha') {
      setIdentifier('asha');
      setPassword('asha123');
    } else {
      setIdentifier('demo');
      setPassword('demo123');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Background Decorative Ambient Medical Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] rounded-full bg-teal-500 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[550px] h-[550px] rounded-full bg-cyan-600 blur-[150px] animate-pulse" />
        <div className="w-full h-full bg-[radial-gradient(#14b8a6_1.2px,transparent_1.2px)] [background-size:28px_28px] opacity-20" />
      </div>

      {/* Top Floating Controls (Language, Theme, Sound) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        {/* Language dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 backdrop-blur-md transition-all shadow-md text-xs font-semibold flex items-center gap-1.5"
          >
            <span>{languages.find(l => l.code === currentLanguage)?.flag}</span>
            <span>{languages.find(l => l.code === currentLanguage)?.nativeLabel}</span>
            <Globe className="w-3.5 h-3.5 text-teal-400" />
          </button>
          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs">
              {languages.map(l => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => { setLanguage(l.code); setIsLangOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 ${l.code === currentLanguage ? 'text-teal-300 font-bold bg-slate-800/60' : 'text-slate-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <span>{l.flag}</span>
                    <span>{l.nativeLabel}</span>
                  </div>
                  {l.code === currentLanguage && <Check className="w-3.5 h-3.5 text-teal-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsThemeOpen(!isThemeOpen)}
            className="p-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 backdrop-blur-md transition-all shadow-md"
            title="Theme"
          >
            <Palette className="w-4 h-4 text-teal-400" />
          </button>
          {isThemeOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 text-xs">
              {themes.map(tOpt => (
                <button
                  key={tOpt.id}
                  type="button"
                  onClick={() => { setTheme(tOpt.id); setIsThemeOpen(false); }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-800 ${tOpt.id === theme ? 'text-teal-300 font-bold bg-slate-800/60' : 'text-slate-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-slate-500" style={{ backgroundColor: tOpt.accentColor }} />
                    <span>{tOpt.name}</span>
                  </div>
                  {tOpt.id === theme && <Check className="w-3.5 h-3.5 text-teal-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sound toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className="p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700 backdrop-blur-md transition-all shadow-md"
          title={isMuted ? 'Sound Off (Click to Enable)' : 'Sound On (Click to Mute)'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
        </button>
      </div>

      <div className="relative z-10 sm:mx-auto sm:w-full sm:max-w-5xl">
        {/* ============================================================ */}
        {/* PHASE 1: INTERACTIVE WELCOME RADAR SCANNER SCREEN            */}
        {/* ============================================================ */}
        {viewMode === 'welcome' ? (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-6">
            {/* Header / Brand Title */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-900/60 border border-teal-500/40 text-teal-300 text-xs font-semibold backdrop-blur-md shadow-inner">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Rural Tele-Ophthalmology Network • Clinical Edition v1.0</span>
              </div>

              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 shadow-xl shadow-teal-500/20 ring-4 ring-teal-500/20 p-1.5">
                  <DrishtiCareLogo size={34} variant="white" />
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white drop-shadow-md">
                  DrishtiCare
                </h1>
              </div>

              <p className="text-sm sm:text-base text-teal-100/90 font-medium max-w-2xl mx-auto">
                Explainable AI-Assisted Diabetic Retinopathy Screening for Rural Healthcare
              </p>
            </div>

            {/* Interactive Retinal Radar Scanner Visualizer + Features Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left: Interactive Simulated Retinal Radar Scanner (5 cols) */}
              <div className="lg:col-span-5 bg-slate-900/90 rounded-3xl p-5 border border-teal-500/30 shadow-2xl backdrop-blur-md text-center relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-teal-400 font-bold">
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Edge Retinal Radar Scanner</span>
                  </div>
                  <span className="text-[10px] font-mono bg-teal-950 text-teal-300 px-2 py-0.5 rounded border border-teal-800">
                    CV Active
                  </span>
                </div>

                {/* Radar Scope */}
                <div className="relative w-64 h-64 mx-auto my-4 rounded-full border-2 border-teal-500/40 bg-radial-scanner flex items-center justify-center overflow-hidden shadow-inner group">
                  <div className="absolute inset-4 rounded-full border border-teal-500/20 pointer-events-none" />
                  <div className="absolute inset-12 rounded-full border border-teal-500/30 pointer-events-none" />
                  <div className="absolute inset-20 rounded-full border border-teal-500/20 pointer-events-none" />
                  <div className="absolute w-full h-[1px] bg-teal-500/20 pointer-events-none" />
                  <div className="absolute h-full w-[1px] bg-teal-500/20 pointer-events-none" />

                  <div className="absolute inset-0 origin-center animate-spin pointer-events-none [animation-duration:4s]">
                    <div className="w-1/2 h-1/2 bg-gradient-to-br from-teal-400/40 via-teal-400/10 to-transparent rounded-tl-full" />
                  </div>

                  <div className="w-3 h-3 rounded-full bg-teal-400 ring-4 ring-teal-500/40 z-10" />

                  {scannerBeacons.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onMouseEnter={() => {
                        sound.playRadarBlip();
                        setActiveBeacon(b);
                      }}
                      onClick={() => {
                        sound.playRadarBlip();
                        setActiveBeacon(b);
                      }}
                      style={{ top: `${b.y}%`, left: `${b.x}%` }}
                      className={`absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${b.color} ring-4 animate-ping z-20 cursor-pointer hover:scale-150 transition-transform`}
                      title={b.title}
                    />
                  ))}
                </div>

                {/* Beacon Inspector Tooltip Box */}
                <div className="min-h-[72px] bg-slate-950/80 rounded-2xl p-3 border border-slate-800 text-left transition-all">
                  {activeBeacon ? (
                    <div className="animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs font-bold text-teal-300">
                        <span>{activeBeacon.title}</span>
                        <span className="text-[10px] uppercase font-mono text-slate-400">{activeBeacon.type}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {activeBeacon.desc}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-3">
                      <Crosshair className="w-4 h-4 text-teal-400 animate-pulse" />
                      <span>Hover over pulsing beacons to inspect lesion detection</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: 3 System Pillars & Interactive Persona Picker (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 hover:border-teal-500/60 transition-all hover:translate-y-[-2px] shadow-lg">
                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center mb-2">
                      <HardDrive className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Offline-First</h4>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Runs 100% in rural PHCs via browser IndexedDB & localStorage.
                    </p>
                  </div>

                  <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 hover:border-cyan-500/60 transition-all hover:translate-y-[-2px] shadow-lg">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-2">
                      <Activity className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Explainable AI</h4>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Grad-CAM attribution & IDRiD lesion mapping.
                    </p>
                  </div>

                  <div className="bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-slate-700/80 hover:border-amber-500/60 transition-all hover:translate-y-[-2px] shadow-lg">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center mb-2">
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Clinical Roles</h4>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      Doctor, ASHA & Healthcare Worker access.
                    </p>
                  </div>
                </div>

                {/* Interactive Portal Launch Pad */}
                <div className="bg-slate-800/90 backdrop-blur-md p-5 rounded-3xl border border-teal-500/30 shadow-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-700">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Access Clinical Vision Portal</span>
                        <Sparkles className="w-4 h-4 text-teal-400" />
                      </h3>
                      <p className="text-xs text-slate-400">
                        Sign in to an existing account or register as a healthcare user
                      </p>
                    </div>

                    {/* Auto-countdown ring */}
                    <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
                      <span className="text-teal-300 font-mono font-bold">{countdown}s</span>
                      <span className="text-slate-400 text-[11px]">Auto-open</span>
                      <button
                        onClick={() => {
                          sound.playClick();
                          setIsPaused(!isPaused);
                        }}
                        className="p-1 hover:text-white text-slate-400 transition-colors"
                        title={isPaused ? "Resume auto-timer" : "Pause auto-timer"}
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* 3 Persona Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        selectPersonaAndFill('doctor');
                        setViewMode('login');
                      }}
                      className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-700/80 text-left border border-cyan-500/40 hover:border-cyan-400 transition-all hover:scale-[1.02] shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold text-xs">
                          <Stethoscope className="w-3.5 h-3.5" />
                          <span>Doctor</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300">
                          MD
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">Dr. Rajesh Varma</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Ophthalmologist</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        selectPersonaAndFill('asha');
                        setViewMode('login');
                      }}
                      className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-700/80 text-left border border-amber-500/40 hover:border-amber-400 transition-all hover:scale-[1.02] shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                          <HeartPulse className="w-3.5 h-3.5" />
                          <span>ASHA Worker</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300">
                          Field
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">Asha Devi</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Community Worker</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        selectPersonaAndFill('hw');
                        setViewMode('login');
                      }}
                      className="p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-700/80 text-left border border-teal-500/40 hover:border-teal-400 transition-all hover:scale-[1.02] shadow-md group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-teal-300 font-bold text-xs">
                          <User className="w-3.5 h-3.5" />
                          <span>Healthcare Worker</span>
                        </div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-teal-950 text-teal-300">
                          PHC
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">Sister Ananya</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Clinical Staff</div>
                    </button>
                  </div>

                  {/* Dual Action Buttons (Login / Register) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        sound.playChime();
                        setError(null);
                        setViewMode('login');
                      }}
                      className="py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 text-xs font-black tracking-wider uppercase shadow-xl shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>SIGN IN TO PORTAL</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setError(null);
                        setViewMode('register');
                      }}
                      className="py-3 rounded-xl bg-slate-700/80 hover:bg-slate-600/90 text-white text-xs font-bold tracking-wider uppercase border border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>REGISTER NEW USER</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'login' ? (
          /* ============================================================ */
          /* PHASE 2: HEALTHCARE CLINICAL LOGIN PORTAL                    */
          /* ============================================================ */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400 sm:max-w-md mx-auto">
            {/* Top Navigation Back to Welcome */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setCountdown(8);
                  setIsPaused(true);
                  setViewMode('welcome');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:text-teal-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← Back to Welcome Scanner</span>
              </button>

              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-teal-400" />
                <span>Encrypted Prototype Auth</span>
              </span>
            </div>

            {/* Main Login Card */}
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 py-8 px-6 sm:px-9 relative overflow-hidden">
              {/* Header inside card */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-md shadow-teal-500/25 mb-3 p-1.5">
                  <DrishtiCareLogo size={32} variant="white" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Clinical Portal Login
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sign in using either your registered Email ID or Username
                </p>
              </div>

              {/* Error / Notice Alert */}
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form */}
              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email ID / Username
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                      placeholder="e.g. doctor, ananya@clinic.org, or demo"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>Remember this device</span>
                  </label>
                  <span className="text-teal-700 hover:underline cursor-pointer font-medium">
                    Forgot credentials?
                  </span>
                </div>

                {/* Primary Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 rounded-xl font-bold text-sm shadow-md shadow-teal-600/20 mt-2 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>LOGIN</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Switch to Register Button */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setError(null);
                    setViewMode('register');
                  }}
                  className="w-full py-2.5 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-slate-700 hover:text-teal-900 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>REGISTER NEW USER ACCOUNT</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Quick Persona Demo Switchers */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <div className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  Instant One-Click Login Personas
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => selectPersonaAndFill('doctor')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      identifier === 'doctor'
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-950 font-bold ring-2 ring-cyan-500/30'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-800">
                      <Stethoscope className="w-3 h-3 text-cyan-600" />
                      <span>Doctor</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                      Dr. Rajesh Varma
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectPersonaAndFill('asha')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      identifier === 'asha'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/30'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800">
                      <HeartPulse className="w-3 h-3 text-amber-600" />
                      <span>ASHA Worker</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                      Asha Devi
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => selectPersonaAndFill('hw')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      identifier === 'demo'
                        ? 'border-teal-600 bg-teal-50 text-teal-950 font-bold ring-2 ring-teal-500/30'
                        : 'border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold text-teal-800">
                      <User className="w-3 h-3 text-teal-600" />
                      <span>Healthcare</span>
                    </div>
                    <div className="text-[9px] text-slate-500 mt-0.5 truncate">
                      Sister Ananya
                    </div>
                  </button>
                </div>
              </div>

              {/* Security & Protocol Notice */}
              <div className="mt-5 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3 text-teal-600" />
                <span>Prototype localStorage Authentication Enabled</span>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* PHASE 3: HEALTHCARE USER REGISTRATION VIEW                   */
          /* ============================================================ */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-400 sm:max-w-lg mx-auto">
            {/* Top Navigation Back to Login */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  setError(null);
                  setViewMode('login');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-300 hover:text-teal-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>← Back to Login</span>
              </button>

              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Shield className="w-3 h-3 text-teal-400" />
                <span>Role-Based Access Control</span>
              </span>
            </div>

            {/* Main Registration Card */}
            <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200/90 py-8 px-6 sm:px-9 relative overflow-hidden">
              {/* Header inside card */}
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 mx-auto flex items-center justify-center text-white shadow-md shadow-teal-500/25 mb-3">
                  <User className="w-6 h-6 stroke-[2.3]" />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Healthcare User Registration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register with your clinical details to access point-of-care screening
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-800 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* Registration Form */}
              <form className="space-y-4" onSubmit={handleRegister}>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                      placeholder="e.g. Dr. Ananya or Sunita Sharma"
                    />
                  </div>
                </div>

                {/* Email ID & Username in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Email ID <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="block w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                      placeholder="name@clinic.org"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="block w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                      placeholder="e.g. ananya"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password in 2 columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="block w-full px-3 pr-10 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Confirm Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative rounded-xl shadow-2xs">
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        className={`block w-full px-3 pr-10 py-2.5 text-sm rounded-xl border ${
                          regConfirmPassword && regConfirmPassword !== regPassword
                            ? 'border-rose-400 focus:ring-rose-500'
                            : 'border-slate-300 focus:ring-teal-500'
                        } focus:outline-none focus:ring-2 font-medium`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Select Healthcare Role <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Doctor */}
                    <div
                      onClick={() => setRegRole('Doctor')}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        regRole === 'Doctor'
                          ? 'border-cyan-600 bg-cyan-50/80 ring-2 ring-cyan-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={regRole === 'Doctor'}
                          onChange={() => setRegRole('Doctor')}
                          className="text-cyan-600 focus:ring-cyan-500"
                        />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Doctor</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Ophthalmologist adjudication
                      </div>
                    </div>

                    {/* ASHA Worker */}
                    <div
                      onClick={() => setRegRole('ASHA Worker')}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        regRole === 'ASHA Worker'
                          ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                          <HeartPulse className="w-4 h-4" />
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={regRole === 'ASHA Worker'}
                          onChange={() => setRegRole('ASHA Worker')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                      </div>
                      <div className="font-bold text-xs text-slate-900">ASHA Worker</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        Community vision screening
                      </div>
                    </div>

                    {/* Hospital Worker / Healthcare Worker */}
                    <div
                      onClick={() => setRegRole('Hospital Worker / Healthcare Worker')}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        regRole === 'Hospital Worker / Healthcare Worker'
                          ? 'border-teal-600 bg-teal-50/80 ring-2 ring-teal-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="radio"
                          name="role"
                          checked={regRole === 'Hospital Worker / Healthcare Worker'}
                          onChange={() => setRegRole('Hospital Worker / Healthcare Worker')}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                      </div>
                      <div className="font-bold text-xs text-slate-900">Hospital Worker / Healthcare Worker</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">
                        PHC intake & camera operation
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Register Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary py-3 rounded-xl font-bold text-sm shadow-md shadow-teal-600/20 mt-4 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Clinical Account...</span>
                    </>
                  ) : (
                    <>
                      <span>REGISTER ACCOUNT</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Back to Login link */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      sound.playClick();
                      setError(null);
                      setViewMode('login');
                    }}
                    className="text-xs text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer"
                  >
                    Already have an account? Login with Email ID or Username →
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

