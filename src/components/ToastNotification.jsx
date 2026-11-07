'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * ToastNotification: Enterprise ERP Floating Notification Banner
 * Replaces clunky native browser alert() with smooth, branded FAG Kemasan toast alerts.
 */
export default function ToastNotification({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <aside
      aria-label="Notifikasi Sistem"
      aria-live="polite"
      className="fixed top-4 right-4 z-[9999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((toast) => {
        const { id, type = 'success', message, title } = toast;

        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
        let containerStyle = 'bg-white border-emerald-500/80 text-emerald-950 shadow-emerald-950/10';
        let barStyle = 'bg-emerald-600';
        let defaultTitle = 'Berhasil';

        if (type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
          containerStyle = 'bg-white border-rose-400 text-rose-950 shadow-rose-950/10';
          barStyle = 'bg-rose-600';
          defaultTitle = 'Pemberitahuan Sistem';
        } else if (type === 'warning') {
          icon = <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
          containerStyle = 'bg-white border-amber-400 text-amber-950 shadow-amber-950/10';
          barStyle = 'bg-amber-500';
          defaultTitle = 'Perhatian / Validasi';
        } else if (type === 'info') {
          icon = <Info className="w-5 h-5 text-blue-600 shrink-0" />;
          containerStyle = 'bg-white border-blue-400 text-blue-950 shadow-blue-950/10';
          barStyle = 'bg-blue-600';
          defaultTitle = 'Informasi';
        }

        return (
          <div
            key={id}
            role="status"
            className={`pointer-events-auto relative overflow-hidden rounded-xl border shadow-xl transition-all duration-300 animate-in slide-in-from-top-3 fade-in ${containerStyle}`}
          >
            {/* Accent colored top bar */}
            <div className={`h-1 w-full ${barStyle}`} />

            <div className="p-3.5 flex items-start space-x-3">
              <div className="mt-0.5">{icon}</div>

              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-extrabold uppercase tracking-wide">
                  {title || defaultTitle}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed font-medium">
                  {message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDismiss && onDismiss(id)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition shrink-0"
                title="Tutup Notifikasi"
                aria-label="Tutup Notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
