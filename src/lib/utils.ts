let counter = 0;
export function uid(prefix: string): string {
  counter = (counter + 1) % 1_000_000;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand}`;
}

export const nowISO = () => new Date().toISOString();
export const addHours = (iso: string, h: number) => new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();
export const addDays = (iso: string, d: number) => addHours(iso, d * 24);

/** YYYY-MM-DD en hora local */
export function toDateOnly(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dateOnlyPlus(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

export const WINDOW_START_HOUR = { manana: 8, mediodia: 11, tarde: 15 } as const;

export function slotStart(date: string, window: keyof typeof WINDOW_START_HOUR): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, WINDOW_START_HOUR[window], 0, 0);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? (() => { const [y, m, dd] = iso.split('-').map(Number); return new Date(y, m - 1, dd); })() : new Date(iso);
  return new Intl.DateTimeFormat('es-PE', opts).format(d);
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

export function hoursBetween(a: string, b: string) {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function visitCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/** Imagen de demostración (SVG) para evidencias de los datos de prueba. Nunca muestra personas. */
export function demoPhoto(label: string, tone: 'before' | 'after' = 'after'): string {
  const bg = tone === 'after' ? '#D9F1EB' : '#F5F8F7';
  const fg = tone === 'after' ? '#075B55' : '#566866';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="${bg}"/><g fill="none" stroke="${fg}" stroke-width="3" opacity=".35"><rect x="150" y="90" width="180" height="150" rx="6"/><path d="M150 140h180M240 90v150"/></g><text x="240" y="290" font-family="sans-serif" font-size="18" fill="${fg}" text-anchor="middle">${label}</text><text x="240" y="318" font-family="sans-serif" font-size="12" fill="${fg}" text-anchor="middle" opacity=".7">Foto de demostración · solo zona de trabajo</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Comprime una imagen subida a JPEG ≤ maxSide px (para no saturar el almacenamiento demo). */
export async function compressImage(file: File, maxSide = 720, quality = 0.62): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('No se pudo leer la imagen'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('Formato de imagen no soportado'));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
