'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function LoginPage({ onLoginSuccess }) {
  // Modes: 'LOGIN', 'FORGOT_PASSWORD', 'RESET_PASSWORD'
  const [authMode, setAuthMode] = useState('LOGIN');

  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Eye toggle states (Show / Hide Password)
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI States
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check URL hash for reset password token
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        setAuthMode('RESET_PASSWORD');
      }
    }
  }, []);

  // 1. Handle Email + Password Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Email dan password wajib diisi!');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email atau password salah! Periksa kembali email dan kata sandi Anda.');
        }
        throw error;
      }

      if (data?.user) {
        setSuccessMessage(`Selamat datang kembali, ${data.user.user_metadata?.full_name || 'Admin'}!`);
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(data.user);
        }, 600);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Gagal masuk. Silakan coba beberapa saat lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#so` : undefined,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      // Browser will redirect to Google login consent
    } catch (err) {
      console.error('Google sign-in error:', err);
      setErrorMessage(
        err.message ||
          'Google Sign-In memerlukan Client ID & Secret di Supabase Console. Anda tetap bisa login langsung menggunakan email dan password di atas.'
      );
      setIsGoogleLoading(false);
    }
  };

  // 3. Handle Forgot Password (Send Reset Email)
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Masukkan email Anda untuk menerima tautan reset password!');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined,
      });

      if (error) throw error;

      setSuccessMessage(
        `Tautan reset password berhasil dikirim ke ${email}! Silakan periksa kotak masuk (Inbox) atau folder Spam email Anda.`
      );
    } catch (err) {
      console.error('Reset request error:', err);
      setErrorMessage(err.message || 'Gagal mengirim email reset password. Pastikan email sudah terdaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Save New Password (After Reset Link Clicked)
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password baru minimal harus 6 karakter!');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password tidak cocok dengan password baru!');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMessage('Password berhasil diperbarui! Mengalihkan ke sistem...');
      setTimeout(() => {
        if (onLoginSuccess) onLoginSuccess(data.user);
        setAuthMode('LOGIN');
      }, 1000);
    } catch (err) {
      console.error('Update password error:', err);
      setErrorMessage(err.message || 'Gagal memperbarui password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#02130D] flex items-center justify-center p-4 overflow-y-auto selection:bg-emerald-500 selection:text-white">
      {/* 1. Deep Luxury Gradient Canvas */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#02140E] via-[#05261B] to-[#0A3D2C] pointer-events-none" />

      {/* 2. Geometric Precision Grid Overlay (Industrial Packaging Motif) */}
      <div
        className="absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, #34D399 1px, transparent 1px), linear-gradient(to bottom, #34D399 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* 3. Glowing Ambient Aurora Orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-400/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[180px] pointer-events-none" />

      {/* 4. Elegant Architecture Wrapper */}
      <div className="relative z-10 w-full max-w-md my-auto flex flex-col items-center">
        {/* Main Card Container (Preserving Exact Layout from Gambar 5) */}
        <div className="w-full bg-white rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.18)] border border-emerald-500/30 overflow-hidden animate-in zoom-in-95 duration-200 backdrop-blur-sm">
          {/* Card Header (Deep Forest Emerald Luxury) */}
          <div className="bg-[#07291D] p-6 text-white text-center border-b border-emerald-900/60 relative">
            <div className="w-16 h-16 bg-white rounded-2xl p-1 mx-auto shadow-lg flex items-center justify-center mb-3.5 border-2 border-emerald-500/40">
              <img
                src="/logo-fag.png"
                alt="FAG Kemasan Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-emerald-100">
              FAG KEMASAN
            </h2>
            <p className="text-xs text-emerald-300/80 font-medium mt-0.5">
              Sistem Kasir, Stok &amp; Pembukuan Terpadu
            </p>

            <div className="mt-3 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-900/80 border border-emerald-700/60 text-[10px] text-emerald-200 font-mono font-bold">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Sistem Otentikasi Resmi</span>
            </div>
          </div>

        {/* Card Body */}
        <div className="p-6 sm:p-7 space-y-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 1: LOGIN FORM                                       */}
          {/* ======================================================== */}
          {authMode === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Field 1: Email */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Email Akun *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@fagkemasan.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              {/* Field 2: Password with Eye Toggle (Show/Hide) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase">
                    Kata Sandi (Password) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage('');
                      setSuccessMessage('');
                      setAuthMode('FORGOT_PASSWORD');
                    }}
                    className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline transition"
                  >
                    Lupa Password?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                  {/* Eye Icon Button (Show / Hide Password) */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
                    className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 focus:outline-none transition active:scale-95"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-emerald-800" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-700 focus:ring-emerald-600 border-slate-300"
                  />
                  <span className="text-[11px] text-slate-600 font-medium">
                    Ingat saya di perangkat ini
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Memverifikasi Akun...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-emerald-300" />
                    <span>Masuk ke Sistem FAG</span>
                  </>
                )}
              </button>

              {/* Divider: Atau */}
              <div className="relative my-3 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative px-3 bg-white text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  atau masuk dengan
                </span>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs shadow-2xs transition active:scale-[0.98] flex items-center justify-center space-x-2.5 disabled:opacity-50"
              >
                {isGoogleLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                    <span>Menghubungkan ke Google...</span>
                  </>
                ) : (
                  <>
                    {/* Official Google SVG Logo */}
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.4 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.42l4.04-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.6 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Masuk Menggunakan Google</span>
                  </>
                )}
              </button>

              {/* Quick Info Box for Default Admin */}
              <div className="mt-3 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-[10px] text-emerald-900 flex items-center justify-between">
                <div>
                  <span className="font-bold block">Akun Super Admin Terdaftar:</span>
                  <span className="font-mono text-emerald-800">fagkemasan@gmail.com</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-200/80 text-emerald-950 font-bold rounded text-[9px]">
                  Owner
                </span>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODE 2: LUPA PASSWORD FORM                               */}
          {/* ======================================================== */}
          {authMode === 'FORGOT_PASSWORD' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Pemulihan Kata Sandi</h3>
                <p className="text-[11px] text-slate-500">
                  Masukkan email akun Anda. Kami akan mengirimkan tautan untuk membuat kata sandi baru.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Email Terdaftar *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@fagkemasan.com"
                    required
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Mengirim Tautan...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 text-emerald-300" />
                    <span>Kirim Link Reset Password</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setSuccessMessage('');
                  setAuthMode('LOGIN');
                }}
                className="w-full py-2 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center space-x-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Halaman Masuk</span>
              </button>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODE 3: BUAT PASSWORD BARU FORM                          */}
          {/* ======================================================== */}
          {authMode === 'RESET_PASSWORD' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Buat Kata Sandi Baru</h3>
                <p className="text-[11px] text-slate-500">
                  Silakan tentukan kata sandi baru untuk akun Anda (minimal 6 karakter).
                </p>
              </div>

              {/* Password Baru with Eye Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Kata Sandi Baru *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4 text-emerald-800" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru with Eye Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Ulangi Kata Sandi Baru *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru..."
                    required
                    className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-700 transition"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4 text-emerald-800" />
                    ) : (
                      <Eye className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-[#0A3828] hover:bg-[#07291D] text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-300" />
                    <span>Menyimpan Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Simpan Password Baru &amp; Masuk</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  </div>
  );
}
