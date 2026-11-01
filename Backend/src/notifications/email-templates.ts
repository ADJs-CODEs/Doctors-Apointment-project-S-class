// Branded HTML for every email the app sends. Email clients ignore <style> blocks and
// external CSS, so everything is inline and table-free enough to render in Gmail/Outlook.

export const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

type Tone = 'teal' | 'red' | 'orange';
const COLORS: Record<Tone, string> = { teal: '#0d9488', red: '#dc2626', orange: '#ea580c' };

export function layout(opts: {
  title: string;
  /** already-escaped HTML */
  body: string;
  tone?: Tone;
  button?: { label: string; url: string };
  /** a second, quieter link next to the button */
  secondary?: { label: string; url: string };
  footer?: string;
}) {
  const color = COLORS[opts.tone ?? 'teal'];
  const button = opts.button
    ? `<a href="${escapeHtml(opts.button.url)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px;">${escapeHtml(opts.button.label)}</a>`
    : '';
  const secondary = opts.secondary
    ? `<a href="${escapeHtml(opts.secondary.url)}" style="display:inline-block;color:${color};text-decoration:none;font-weight:700;padding:12px 6px;margin-left:8px;">${escapeHtml(opts.secondary.label)}</a>`
    : '';

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:28px 16px;">
    <p style="margin:0 0 18px;font-size:15px;font-weight:900;letter-spacing:-0.3px;">
      <span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;border-radius:50%;background:#ecfdfa;color:${COLORS.teal};margin-right:6px;">+</span>ADJ&#39;s <span style="color:${COLORS.teal};">CODEs</span>
    </p>
    <div style="background:#ffffff;border-radius:20px;padding:28px 24px;border-top:4px solid ${color};">
      <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;">${escapeHtml(opts.title)}</h1>
      <div style="font-size:15px;line-height:1.6;color:#334155;">${opts.body}</div>
      ${button || secondary ? `<div style="margin-top:22px;">${button}${secondary}</div>` : ''}
    </div>
    <p style="margin:18px 4px 0;font-size:12px;line-height:1.5;color:#94a3b8;">
      ${opts.footer ?? 'You are receiving this because you have an account with ADJ&#39;s CODEs.'}
    </p>
  </div>
</body></html>`;
}

/** A label/value list, e.g. Doctor / Date / Time. Values are escaped here. */
export const details = (rows: [string, unknown][]) =>
  `<table role="presentation" style="width:100%;border-collapse:collapse;margin:14px 0;background:#f8fafc;border-radius:12px;">${rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 14px;font-size:13px;color:#64748b;width:38%;">${escapeHtml(label)}</td><td style="padding:8px 14px;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>`;

export const quote = (text: string, tone: Tone = 'teal') =>
  `<blockquote style="margin:14px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid ${COLORS[tone]};border-radius:8px;white-space:pre-wrap;">${escapeHtml(text)}</blockquote>`;
