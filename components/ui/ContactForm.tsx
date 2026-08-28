'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { CONTACT } from '@/lib/content';

/**
 * HIPAA-aware v1 intake, per CLAUDE.md.
 *
 * COLLECTS: name, email, phone, general reason for contact.
 * DOES NOT COLLECT, and must not be extended to collect without an explicit
 * decision and a BAA-covered processor: symptoms, diagnoses, medications,
 * insurance ID or member numbers, date of birth, SSN, free-text clinical
 * detail, or file uploads.
 *
 * Reason is a constrained select rather than an open prompt, so the field
 * cannot invite clinical disclosure.
 *
 * Labels sit above inputs. Helper text renders in --color-np-neutral-600
 * (7.1:1 on white) and error text in --color-np-error (6.5:1), both verified.
 */

type Errors = Partial<Record<'name' | 'email' | 'phone', string>>;

export function ContactForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();

    const next: Errors = {};
    if (!name) next.name = 'Please enter your name.';
    if (!email) next.email = 'Please enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = 'Please check this email address.';
    if (phone && !/^[\d\s().+-]{7,}$/.test(phone)) next.phone = 'Please check this phone number.';

    setErrors(next);
    if (Object.keys(next).length === 0) {
      // CLIENT: no submission endpoint is wired yet. Before launch, post to a
      // BAA-covered handler or a plain mail relay. Do not add PHI fields.
      setSubmitted(true);
    }
  }

  const field =
    'w-full rounded-input bg-np-surface px-4 py-3 text-body text-np-ink ring-1 ring-[var(--np-alpha-ink-12)] transition-shadow duration-[180ms] ease-np-out focus:ring-2 focus:ring-np-blue-600';
  const labelCls = 'block text-small font-medium text-np-ink';
  const errCls = 'mt-1.5 text-small text-np-error';

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-card bg-np-surface p-8 ring-1 ring-[var(--np-alpha-ink-08)]"
      >
        <h3 className="text-h3">Thank you</h3>
        <p className="text-body text-np-neutral-600 mt-3 max-w-[52ch]">
          We have your details and will be in touch about an appointment. If you need to reach us
          sooner, please call the practice.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5">
      <div>
        <label htmlFor="name" className={labelCls}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={`mt-2 ${field}`}
        />
        {errors.name && (
          <p id="name-error" className={errCls}>
            {errors.name}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className={labelCls}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`mt-2 ${field}`}
          />
          {errors.email && (
            <p id="email-error" className={errCls}>
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className={labelCls}>
            Phone <span className="text-np-neutral-600 font-normal">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            className={`mt-2 ${field}`}
          />
          {errors.phone && (
            <p id="phone-error" className={errCls}>
              {errors.phone}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="reason" className={labelCls}>
          Reason for contact
        </label>
        <select
          id="reason"
          name="reason"
          defaultValue={CONTACT.reasons[0]}
          className={`mt-2 ${field}`}
        >
          {CONTACT.reasons.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <p id="reason-help" className="text-small text-np-neutral-600 mt-2 max-w-[56ch]">
          {CONTACT.privacyNote}
        </p>
      </div>

      <div className="mt-1">
        <Button type="submit" size="lg">
          Send
        </Button>
      </div>
    </form>
  );
}
