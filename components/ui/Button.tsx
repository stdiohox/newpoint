import { ReactNode } from 'react';

/**
 * Radius rule: buttons are pills. Contrast verified in design-tokens.md 1.6,
 * white on --color-np-blue-600 measures 8.8:1 (AAA).
 * Press feedback is instant per the Apple response principle.
 */
const base =
  'inline-flex items-center justify-center gap-2 rounded-pill whitespace-nowrap font-medium ' +
  'transition-[background-color,transform,box-shadow] duration-[180ms] ease-np-out ' +
  'active:scale-[0.98] active:duration-[100ms]';

const sizes = {
  md: 'px-5 py-2.5 text-small',
  lg: 'px-7 py-3.5 text-body',
};

const variants = {
  primary: 'bg-np-blue-600 text-white hover:bg-np-blue-700',
  onInk: 'bg-white text-np-ink hover:bg-np-neutral-100',
  quiet:
    'bg-transparent text-np-blue-600 ring-1 ring-[var(--np-alpha-ink-12)] hover:bg-[var(--np-alpha-ink-04)]',
};

export function Button({
  children,
  href,
  type,
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  children: ReactNode;
  href?: string;
  type?: 'button' | 'submit';
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`;
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type={type ?? 'button'} className={cls}>
      {children}
    </button>
  );
}
