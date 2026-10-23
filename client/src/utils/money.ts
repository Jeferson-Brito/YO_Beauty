export function centsFromInput(value: string): number | null {
  const raw = value.trim().replace(/\s/g, '');
  if (!raw) return null;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function reaisInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

export function whatsappDigits(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) digits = `55${digits}`;
  return digits;
}

export function whatsappHref(phone: string, message: string): string | null {
  const digits = whatsappDigits(phone);
  if (!digits) return null;
  const text = encodeURIComponent(message || 'Olá! Vim pela loja Yo Beauty.');
  return `https://wa.me/${digits}?text=${text}`;
}
