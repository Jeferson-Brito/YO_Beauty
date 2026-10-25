import { formatPostalCode } from './cep';
import { formatBRL } from './money';
import { paymentMethodLabel } from './order-whatsapp';

export type PrintableOrder = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string;
  subtotalCents?: number;
  shippingCostCents?: number;
  discountAmountCents?: number;
  totalCents: number;
  paymentStatus: string;
  orderStatus: string;
  address: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postalCode?: string;
  };
  items: { id: string; name: string; sku?: string; quantity: number; lineTotalCents: number }[];
  payment?: { provider?: string | null } | null;
};

const paymentStatusLabel: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  FAILED: 'Pagamento não concluído',
  REFUNDED: 'Estornado',
  PARTIALLY_REFUNDED: 'Estornado em parte',
  CANCELLED: 'Cancelado',
};

const orderStatusLabel: Record<string, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID_AWAITING_PROCESSING: 'Pago, aguardando separação',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function line(label: string, value: string) {
  return `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

export function printOrder(order: PrintableOrder) {
  const popup = window.open('', 'yo-beauty-receipt', 'popup,width=420,height=720');
  if (!popup) return false;

  const when = new Date(order.createdAt).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Recife',
  });
  const address = order.address;
  const street = [address.street?.trim(), address.number?.trim()].filter(Boolean).join(', ');
  const place = [address.city?.trim(), address.state?.trim()].filter(Boolean).join('/');
  const postal = formatPostalCode(address.postalCode);
  const payment = paymentMethodLabel(order.payment?.provider) || 'A combinar';
  const items = order.items
    .map((item) => {
      const sku = item.sku ? `<div class="sku">${escapeHtml(item.sku)}</div>` : '';
      return `<div class="item"><div>${item.quantity}× ${escapeHtml(item.name)}</div>${sku}<div class="price">${escapeHtml(formatBRL(item.lineTotalCents))}</div></div>`;
    })
    .join('');
  const freight = (order.shippingCostCents ?? 0) > 0 ? formatBRL(order.shippingCostCents ?? 0) : 'Grátis';
  const discount = (order.discountAmountCents ?? 0) > 0 ? line('Desconto', formatBRL(order.discountAmountCents ?? 0)) : '';

  popup.document.open();
  popup.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Pedido ${escapeHtml(order.orderNumber)}</title>
  <style>
    @page { size: 58mm auto; margin: 2mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; width: 54mm; color: #000; background: #fff; }
    body { font: 12px/1.35 Arial, "Segoe UI", sans-serif; }
    h1 { margin: 0; text-align: center; font-size: 16px; letter-spacing: 0.12em; }
    .center { text-align: center; }
    .rule { border-top: 1px dashed #000; margin: 6px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    .item { margin-top: 6px; }
    .sku, .muted { font-size: 10px; }
    .price { text-align: right; }
    strong { font-weight: 700; }
  </style>
</head>
<body>
  <h1>YO BEAUTY</h1>
  <p class="center muted">Makes, cosméticos e acessórios</p>
  <div class="rule"></div>
  <div class="center"><strong>${escapeHtml(order.orderNumber)}</strong><br />${escapeHtml(when)}</div>
  <div class="rule"></div>
  <div><strong>${escapeHtml(order.customerName)}</strong></div>
  <div>${escapeHtml(order.customerPhone)}</div>
  <div class="muted">${escapeHtml(order.customerEmail)}</div>
  <div class="rule"></div>
  <div>${escapeHtml(street)}</div>
  ${address.complement?.trim() ? `<div>${escapeHtml(address.complement.trim())}</div>` : ''}
  ${address.neighborhood?.trim() ? `<div>${escapeHtml(address.neighborhood.trim())}</div>` : ''}
  <div>${escapeHtml(place)}</div>
  ${postal ? `<div>CEP ${escapeHtml(postal)}</div>` : ''}
  <div class="rule"></div>
  ${items}
  <div class="rule"></div>
  ${line('Subtotal', formatBRL(order.subtotalCents ?? order.totalCents))}
  ${line('Frete', freight)}
  ${discount}
  ${line('Total', formatBRL(order.totalCents))}
  <div class="rule"></div>
  ${line('Pagamento', payment)}
  <div>${escapeHtml(paymentStatusLabel[order.paymentStatus] ?? order.paymentStatus)}</div>
  <div>${escapeHtml(orderStatusLabel[order.orderStatus] ?? order.orderStatus)}</div>
  <div class="rule"></div>
  <p class="center">Obrigada pela compra</p>
</body>
</html>`);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => {
    popup.print();
  }, 250);
  return true;
}
