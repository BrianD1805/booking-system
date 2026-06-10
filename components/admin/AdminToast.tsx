'use client';

import { useEffect, useState } from 'react';

type AdminToastTone = 'success' | 'info' | 'warning';

type AdminToast = {
  id: number;
  message: string;
  tone: AdminToastTone;
};

export function showAdminToast(message: string, tone: AdminToastTone = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('zipbook-admin-toast', { detail: { message, tone } }));
}

export function AdminToastHost() {
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  useEffect(() => {
    function handleToast(event: Event) {
      const custom = event as CustomEvent<{ message?: string; tone?: AdminToastTone }>;
      const message = custom.detail?.message?.trim();
      if (!message) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const tone = custom.detail?.tone ?? 'success';
      setToasts((current) => [...current.slice(-3), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3600);
    }

    window.addEventListener('zipbook-admin-toast', handleToast);
    return () => window.removeEventListener('zipbook-admin-toast', handleToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="admin-toast-stack" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`admin-toast ${toast.tone}`}>
          <span className="admin-toast-icon" aria-hidden="true">{toast.tone === 'warning' ? '!' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
