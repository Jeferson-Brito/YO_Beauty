import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiGet } from '../../services/api';

type GoogleConfig = { data: { clientId: string | null } };
type CredentialResponse = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: CredentialResponse) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number>) => void;
        };
      };
    };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  scriptPromise ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('google')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('google'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function GoogleAuthButton({ onCredential, onError }: { onCredential: (credential: string) => void; onError: (message: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const credentialRef = useRef(onCredential);
  const errorRef = useRef(onError);
  credentialRef.current = onCredential;
  errorRef.current = onError;
  const config = useQuery({
    queryKey: ['google-config'],
    queryFn: () => apiGet<GoogleConfig>('/api/auth/google/config'),
    staleTime: 60_000,
  });
  const clientId = config.data?.data.clientId ?? '';

  useEffect(() => {
    if (!clientId || !host.current) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !host.current || !window.google?.accounts?.id) return;
        host.current.replaceChildren();
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) credentialRef.current(response.credential);
            else errorRef.current('Não foi possível entrar com o Google.');
          },
        });
        window.google.accounts.id.renderButton(host.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
          locale: 'pt-BR',
        });
      })
      .catch(() => {
        if (!cancelled) errorRef.current('Não foi possível carregar o login do Google.');
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (config.isLoading) return null;
  if (!clientId) {
    return (
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-full border border-blush-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-700 transition hover:border-magenta-400"
        onClick={() => onError('O login com Google ainda não está configurado nesta loja.')}
      >
        <GoogleMark />
        Continuar com Google
      </button>
    );
  }

  return <div ref={host} className="flex justify-center" />;
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7A5.4 5.4 0 0 1 3.6 9c0-.6.1-1.2.3-1.7V5H.9A9 9 0 0 0 0 9c0 1.4.3 2.8.9 4l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15.1 2A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  );
}
