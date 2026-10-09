'use client';

/**
 * The LIVE contact form: rendered by ContactCrisis only when NEXT_PUBLIC_INTAKE_URL and
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY are set at build. With the flag off (the default) the
 * site renders OnboardingForm exactly as before and none of this reaches the page.
 *
 * Posts straight from the browser to the BAA-covered intake handler
 * (automation/edge/intake): no Next.js route, server action or middleware in between,
 * and no analytics on the fields (automation spec §5.5). Same fields as the
 * OnboardingForm (name, email, optional phone, the constrained reason) per the
 * CLAUDE.md HIPAA rule, plus an UNTICKED SMS consent box and a Turnstile check. With
 * consent and a phone, a 6-digit code is texted and entered here.
 *
 * Carries over OnboardingForm's accessibility decisions: method="post", focus on the
 * first invalid field, aria-busy rather than a disabled button, focus moved to the
 * heading of each new stage, and every failure hands over the practice's phone number.
 */
import * as React from 'react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';

type Field = 'name' | 'email' | 'phone' | 'code';
type Errors = Partial<Record<Field, string>>;
type Stage = 'form' | 'code' | 'done';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
          'timeout-callback': () => void;
          'unsupported-callback': () => void;
        }
      ) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

const SELECT_CLASS =
  'border-np-neutral-300 focus-visible:ring-np-blue-600 flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none';
const LABEL_CLASS = 'text-np-ink block text-small font-medium';
const ERROR_CLASS = 'text-np-error mt-1.5 text-small';
const LINK_CLASS = 'text-np-blue-600 underline underline-offset-2';

export interface IntakeFormProps {
  className?: string;
  intakeUrl: string;
  turnstileSiteKey: string;
  title: string;
  description: string;
  buttonText: string;
  reasons: readonly string[];
  privacyNote: string;
  consent: { version: number; text: string };
  success: { heading: string; body: string };
  codeStep: { heading: string; body: string };
  /** The practice line, as a working tel: link: the fallback every failure hands over. */
  phone: { label: string; href: string };
}

export function IntakeForm({
  className,
  intakeUrl,
  turnstileSiteKey,
  title,
  description,
  buttonText,
  reasons,
  privacyNote,
  consent,
  success,
  codeStep,
  phone,
}: IntakeFormProps) {
  const [stage, setStage] = useState<Stage>('form');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  /* A ref, not state: two quick Enter presses both read the same render's state. */
  const inFlight = useRef(false);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    code: useRef<HTMLInputElement>(null),
  };
  const noteId = useId();
  const consentId = useId();
  const consentTextId = useId();

  const checkFailed = () => {
    setToken(null);
    setFailure('The security check didn’t load. Please call the practice instead.');
  };

  function renderWidget() {
    if (stage !== 'form' || !window.turnstile || !widgetRef.current || widgetId.current !== null)
      return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: turnstileSiteKey,
      callback: (t) => {
        setToken(t);
        setFailure(null);
      },
      'expired-callback': () => setToken(null),
      'error-callback': checkFailed,
      'timeout-callback': checkFailed,
      'unsupported-callback': checkFailed,
    });
  }

  /* The widget lives only on the form stage: rendered when it mounts, removed when it goes. */
  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetId.current !== null) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /* Focus follows the stage so a keyboard or screen-reader user lands on what changed. */
  useEffect(() => {
    if (stage !== 'form') headingRef.current?.focus();
  }, [stage]);

  function fail(next: Errors) {
    setErrors(next);
    const first = (['name', 'email', 'phone', 'code'] as const).find((k) => next[k]);
    if (first) fieldRefs[first].current?.focus();
  }

  async function post(
    path: string,
    body: object
  ): Promise<{ status: number; data: Record<string, unknown> }> {
    const response = await fetch(`${intakeUrl.replace(/\/+$/, '')}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: response.status, data };
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    const form = new FormData(e.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const phoneValue = String(form.get('phone') ?? '').trim();
    const smsConsent = form.get('smsConsent') === 'on';
    const next: Errors = {};
    if (!name) next.name = 'Please enter your name.';
    if (!email) next.email = 'Please enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Please check this email address.';
    if (phoneValue && !/^[\d\s().+-]{7,}$/.test(phoneValue))
      next.phone = 'Please check this phone number.';
    if (smsConsent && !phoneValue)
      next.phone = 'Add a phone number to get texts, or untick the box below.';
    if (Object.keys(next).length > 0) return fail(next);
    setErrors({});
    if (token === null) {
      setFailure('Please complete the security check above the button, then send again.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const { status, data } = await post('/intake', {
        name,
        email,
        ...(phoneValue ? { phone: phoneValue } : {}),
        reason: String(form.get('reason') ?? reasons[0]),
        smsConsent,
        consentVersion: consent.version,
        turnstileToken: token,
      });
      if (status === 200) {
        const id = typeof data.verificationId === 'string' ? data.verificationId : null;
        setVerificationId(id);
        setStage(id === null ? 'done' : 'code');
        return;
      }
      if (status === 400 && data.field === 'phone')
        fail({ phone: 'Please enter a US phone number.' });
      else if (status === 429) setFailure('Too many requests from here just now.');
      else setFailure('We couldn’t send that.');
    } catch {
      setFailure('We couldn’t send that.');
    } finally {
      inFlight.current = false;
      setBusy(false);
      if (window.turnstile && widgetId.current !== null) window.turnstile.reset(widgetId.current);
      setToken(null);
    }
  }

  async function onCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || verificationId === null) return;
    const code = String(new FormData(e.currentTarget).get('code') ?? '').replace(/\s/g, '');
    /* Cleared first, so the same message re-announces on a second failure. */
    setErrors({});
    if (!/^\d{6}$/.test(code)) {
      fail({ code: 'Enter the 6 digits from the text.' });
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const { status } = await post('/intake/verify', { verificationId, code });
      if (status === 200) setStage('done');
      else
        fail({
          code: 'That code didn’t work. Check the text and try again. Your request is still with us.',
        });
    } catch {
      setFailure(
        'We couldn’t check that code. Your request is still with us, and we’ll be in touch.'
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const failureAlert = failure && (
    <p role="alert" className={ERROR_CLASS}>
      {failure} You can always call the practice at{' '}
      <a href={phone.href} className={LINK_CLASS}>
        {phone.label}
      </a>
      .
    </p>
  );
  const sending = (
    <span role="status" className="sr-only">
      {busy ? 'Sending…' : ''}
    </span>
  );

  return (
    <div
      className={cn(
        'glass-card w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-lg backdrop-blur-lg',
        className
      )}
    >
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
        onError={checkFailed}
      />
      <div className="space-y-6 p-8">
        <div className="space-y-2 text-center">
          <h2 className="text-np-ink text-2xl font-bold">{title}</h2>
          {stage === 'form' && <p className="text-np-neutral-600">{description}</p>}
        </div>

        {stage === 'done' && (
          <div role="status" className="py-4">
            <h3 ref={headingRef} tabIndex={-1} className="text-h3 focus:outline-none">
              {success.heading}
            </h3>
            <p className="text-body text-np-neutral-600 mt-3">{success.body}</p>
          </div>
        )}

        {stage === 'code' && (
          <form onSubmit={onCode} method="post" noValidate aria-busy={busy} className="space-y-4">
            <h3 ref={headingRef} tabIndex={-1} className="text-h3 focus:outline-none">
              {codeStep.heading}
            </h3>
            <p className="text-body text-np-neutral-600">{codeStep.body}</p>
            <div>
              <label htmlFor="code" className={LABEL_CLASS}>
                6-digit code
              </label>
              <Input
                ref={fieldRefs.code}
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                aria-invalid={Boolean(errors.code)}
                aria-describedby={errors.code ? 'code-error' : undefined}
                className="mt-2"
              />
              {errors.code && (
                <p id="code-error" className={ERROR_CLASS}>
                  {errors.code}
                </p>
              )}
            </div>
            {failureAlert}
            {sending}
            <Button type="submit" size="lg" className="w-full">
              {busy && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </form>
        )}

        {stage === 'form' && (
          <form onSubmit={onSubmit} method="post" noValidate aria-busy={busy} className="space-y-4">
            <div>
              <label htmlFor="name" className={LABEL_CLASS}>
                Name
              </label>
              <Input
                ref={fieldRefs.name}
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className="mt-2"
              />
              {errors.name && (
                <p id="name-error" className={ERROR_CLASS}>
                  {errors.name}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="email" className={LABEL_CLASS}>
                Email
              </label>
              <Input
                ref={fieldRefs.email}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className="mt-2"
              />
              {errors.email && (
                <p id="email-error" className={ERROR_CLASS}>
                  {errors.email}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="phone" className={LABEL_CLASS}>
                Phone <span className="text-np-neutral-600 font-normal">(optional)</span>
              </label>
              <Input
                ref={fieldRefs.phone}
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
                className="mt-2"
              />
              {errors.phone && (
                <p id="phone-error" className={ERROR_CLASS}>
                  {errors.phone}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="reason" className={LABEL_CLASS}>
                Reason for contact
              </label>
              <select
                id="reason"
                name="reason"
                defaultValue={reasons[0]}
                aria-describedby={noteId}
                className={cn(SELECT_CLASS, 'mt-2')}
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-start gap-3">
              {/* Unticked by default and never required: consent is not a condition of care.
                  A short accessible name; the full disclosure is its description. 24px for SC 2.5.8. */}
              <input
                id={consentId}
                name="smsConsent"
                type="checkbox"
                aria-describedby={consentTextId}
                className="mt-0.5 h-6 w-6 shrink-0"
              />
              <div>
                <label htmlFor={consentId} className="text-np-ink text-small font-medium">
                  Text me about my request
                </label>
                <p id={consentTextId} className="text-small text-np-neutral-600 mt-1">
                  {consent.text}
                </p>
              </div>
            </div>
            <div className="space-y-4 pt-2">
              <p id={noteId} className="text-small text-np-neutral-600">
                {privacyNote}
              </p>
              <div ref={widgetRef} role="group" aria-label="Security check" />
              {failureAlert}
              {sending}
              <Button type="submit" size="lg" className="w-full">
                {busy && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
                {buttonText}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
