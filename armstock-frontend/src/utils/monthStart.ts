/** The first moment of the current month in the browser's time zone, as an ISO date-time. */
export const monthStartIso = (): string => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
};
