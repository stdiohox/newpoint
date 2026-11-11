/**
 * Shared class strings for the CRM's forms and cards. Plain constants in their
 * own module so client components can import them without pulling a server
 * component (CrmChrome) into the browser bundle.
 *
 * Focus uses `outline-hidden` (a transparent outline that forced-colors mode
 * still draws) plus a ring, never `outline-none`, which would leave no focus
 * indicator at all in Windows High Contrast.
 */
export const CRM_FIELD =
  'border-np-neutral-500 text-np-ink placeholder:text-np-neutral-600 focus-visible:ring-np-ink block w-full rounded-md border bg-white px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-hidden';
export const CRM_LABEL = 'text-np-ink block text-sm font-medium';
export const CRM_BUTTON =
  'bg-np-ink text-white hover:bg-np-neutral-900 focus-visible:outline-np-ink inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 aria-busy:opacity-70';
export const CRM_CARD = 'border-np-neutral-200 rounded-lg border bg-white';
