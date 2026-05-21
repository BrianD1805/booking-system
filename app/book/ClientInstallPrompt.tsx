'use client';

import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'zipbook-client-install-dismissed-v0.008';
const INSTALLED_KEY = 'zipbook-client-install-installed-v0.008';

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true);
}

function isIosSafariLike() {
  if (typeof window === 'undefined') return false;
  const platform = window.navigator.platform || '';
  const userAgent = window.navigator.userAgent || '';
  const isIosDevice = /iPad|iPhone|iPod/.test(platform) || (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
  return isIosDevice && isSafari;
}

export function ClientInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHelpVisible, setIosHelpVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  const supportsNativePrompt = useMemo(() => Boolean(installEvent), [installEvent]);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === 'true';
    const installed = window.localStorage.getItem(INSTALLED_KEY) === 'true' || isStandaloneDisplay();
    setIsInstalled(installed);

    if (installed || dismissed) return;

    const ios = isIosSafariLike();
    let fallbackTimer: number | undefined;

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    }

    function handleAppInstalled() {
      window.localStorage.setItem(INSTALLED_KEY, 'true');
      setIsInstalled(true);
      setVisible(false);
      setInstallEvent(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (ios) {
      fallbackTimer = window.setTimeout(() => {
        if (!isStandaloneDisplay()) {
          setIosHelpVisible(true);
          setVisible(true);
        }
      }, 1800);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent || installing) return;
    setInstalling(true);

    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        window.localStorage.setItem(INSTALLED_KEY, 'true');
        setIsInstalled(true);
      }
      setVisible(false);
      setInstallEvent(null);
    } finally {
      setInstalling(false);
    }
  }

  function dismissPrompt() {
    window.localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  }

  if (!visible || isInstalled) return null;

  return (
    <aside className="install-prompt" role="dialog" aria-live="polite" aria-label="Install ZipBook app">
      <div className="install-prompt-icon" aria-hidden="true">✓</div>
      <div className="install-prompt-copy">
        <strong>Install ZipBook</strong>
        {supportsNativePrompt ? (
          <span>Add this booking app to your phone for quicker appointment booking next time.</span>
        ) : iosHelpVisible ? (
          <span>On iPhone, tap Share, then choose Add to Home Screen.</span>
        ) : (
          <span>Add this booking app to your phone for quicker appointment booking next time.</span>
        )}
      </div>
      <div className="install-prompt-actions">
        {supportsNativePrompt && (
          <button className="button primary install-button" type="button" onClick={handleInstall} disabled={installing}>
            {installing ? 'Opening…' : 'Install App'}
          </button>
        )}
        <button className="pill install-dismiss" type="button" onClick={dismissPrompt}>Not now</button>
      </div>
    </aside>
  );
}
