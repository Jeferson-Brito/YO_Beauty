import type { PaymentFlags } from '../types/catalog';
import { formatBRL, whatsappHref } from './money';
import { formatPostalCode } from './cep';

export const DEFAULT_STORE_WHATSAPP = '83981131352';

export const PAYMENT_METHODS = [
  { id: 'cash', flag: 'cash', label: 'Dinheiro' },
  { id: 'pix', flag: 'pix', label: 'PIX' },
  { id: 'credit', flag: 'creditCard', label: 'Crédito' },
  { id: 'debit', flag: 'debitCard', label: 'Débito' },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];

export function paymentMethodLabel(id?: string | null) {
  return PAYMENT_METHODS.find((method) => method.id === id)?.label ?? (id === 'boleto' ? 'Boleto' : '');
}

export function enabledPaymentMethods(flags?: PaymentFlags | null) {
  return PAYMENT_METHODS.filter((method) => flags?.[method.flag] !== false);
}

type OrderMessage = {
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  address: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  subtotalCents: number;
  shippingCostCents: number;
  totalCents: number;
  payment?: { provider?: string | null } | null;
};

export function orderWhatsappText(order: OrderMessage, freeShippingThresholdCents = 0) {
  const address = order.address;
  const postal = formatPostalCode(address.postalCode);
  const complement = address.complement?.trim();
  const street = [address.street?.trim(), address.number?.trim()].filter(Boolean).join(', ');
  const place = [address.neighborhood?.trim(), [address.city?.trim(), address.state?.trim()].filter(Boolean).join('/')].filter(Boolean).join(' — ');
  const freeShipping = freeShippingThresholdCents > 0 && order.shippingCostCents === 0 && order.subtotalCents >= freeShippingThresholdCents;
  const freight = order.shippingCostCents > 0 ? formatBRL(order.shippingCostCents) : freeShipping ? 'Grátis' : 'Ainda não incluído';
  const method = paymentMethodLabel(order.payment?.provider) || 'A combinar';
  const items = order.items
    .map((item) => `• ${item.quantity}× ${item.name}\n  ${formatBRL(item.unitPriceCents)} cada · ${formatBRL(item.lineTotalCents)}`)
    .join('\n');

  return [
    '*Novo pedido Yo Beauty*',
    `Número: ${order.orderNumber}`,
    '',
    '*Cliente*',
    `Nome: ${order.customerName}`,
    order.customerPhone ? `Telefone: ${order.customerPhone}` : '',
    order.customerEmail ? `E-mail: ${order.customerEmail}` : '',
    '',
    '*Entrega*',
    street + (complement ? ` — ${complement}` : ''),
    place,
    postal ? `CEP: ${postal}` : '',
    '',
    '*Itens*',
    items,
    '',
    '*Valores*',
    `Subtotal: ${formatBRL(order.subtotalCents)}`,
    `Frete: ${freight}`,
    `Total: ${formatBRL(order.totalCents)}`,
    '',
    '*Pagamento*',
    `Forma escolhida: ${method}`,
    'Nenhuma cobrança foi feita no site. O pedido aguarda a confirmação da loja.',
  ]
    .filter((line, index, list) => line !== '' || list[index - 1] !== '')
    .join('\n')
    .trim();
}

export function orderWhatsappHref(order: OrderMessage, phone: string, freeShippingThresholdCents = 0) {
  return whatsappHref(phone || DEFAULT_STORE_WHATSAPP, orderWhatsappText(order, freeShippingThresholdCents));
}

export function showWhatsapp(popup: Window | null, href: string | null) {
  if (!popup) return;
  if (!href) {
    popup.close();
    return;
  }
  popup.location.replace(href);
}
