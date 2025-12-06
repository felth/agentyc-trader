export function minutesUntil(dateISO: string): number {
  const now = new Date();
  const then = new Date(dateISO);
  return Math.floor((then.getTime() - now.getTime()) / 60000);
}

