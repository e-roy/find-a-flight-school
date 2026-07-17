"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
    }
  ) => string;
  reset: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface TurnstileHandle {
  /** Discard the current token and fetch a fresh one (Turnstile tokens are single-use). */
  reset: () => void;
}

interface TurnstileWidgetProps {
  /** Called with a fresh token, or "" when the token is cleared/expired. */
  onVerify: (token: string) => void;
}

/**
 * Cloudflare Turnstile widget (explicit render, no npm dependency). Exposes a
 * `reset()` so the parent can obtain a fresh token after each server call.
 */
export const TurnstileWidget = forwardRef<TurnstileHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onVerify }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const onVerifyRef = useRef(onVerify);
    onVerifyRef.current = onVerify;

    const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset() {
        if (window.turnstile && widgetId.current) {
          onVerifyRef.current("");
          window.turnstile.reset(widgetId.current);
        }
      },
    }));

    useEffect(() => {
      if (!sitekey) return;
      let cancelled = false;
      let poll: ReturnType<typeof setInterval> | undefined;

      function render() {
        if (
          cancelled ||
          !containerRef.current ||
          !window.turnstile ||
          widgetId.current
        ) {
          return;
        }
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: sitekey as string,
          callback: (token: string) => onVerifyRef.current(token),
          "error-callback": () => onVerifyRef.current(""),
          "expired-callback": () => onVerifyRef.current(""),
        });
      }

      if (window.turnstile) {
        render();
      } else {
        if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
          const script = document.createElement("script");
          script.src = SCRIPT_SRC;
          script.async = true;
          script.defer = true;
          document.head.appendChild(script);
        }
        poll = setInterval(() => {
          if (window.turnstile) {
            if (poll) clearInterval(poll);
            render();
          }
        }, 200);
      }

      return () => {
        cancelled = true;
        if (poll) clearInterval(poll);
      };
    }, [sitekey]);

    if (!sitekey) {
      return (
        <p className="text-sm text-amber-600">
          Human verification is not configured (set
          NEXT_PUBLIC_TURNSTILE_SITE_KEY).
        </p>
      );
    }

    return <div ref={containerRef} />;
  }
);
