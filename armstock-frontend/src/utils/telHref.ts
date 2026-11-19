/** `tel:` link from a free-text phone - keeps only a leading + and digits; null when nothing callable is left. */
export const telHref = (phone: string | null): string | null => {
  const digits = phone?.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return digits && /\d/.test(digits) ? `tel:${digits}` : null;
};
