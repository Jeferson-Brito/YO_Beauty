import { describe, expect, it } from 'vitest';
import { orderWhatsappText } from '../../client/src/utils/order-whatsapp';
import { writeReceipt } from '../../client/src/utils/print-order';

describe('forma escolhida nos comprovantes', () => {
  it.each([['pix', 'PIX'], ['cash', 'Dinheiro'], ['credit', 'Crédito'], ['debit', 'Débito']])('mantém %s no WhatsApp e na impressão sem exigir confirmação de pagamento', (paymentMethod, label) => {
    const order = {
      orderNumber: 'TESTE-001', customerName: 'Cliente teste', customerEmail: 'teste@example.local', customerPhone: '',
      createdAt: '2026-11-07T12:00:00.000Z', address: {}, orderStatus: 'CONFIRMED', paymentMethod,
      subtotalCents: 1000, shippingCostCents: 0, totalCents: 1000,
      items: [{ id: 'item', name: 'Produto teste', quantity: 1, unitPriceCents: 1000, lineTotalCents: 1000 }],
    };
    const text = orderWhatsappText(order);
    let html = '';
    writeReceipt({ open() {}, write(value: string) { html = value; }, close() {} } as unknown as Document, order);
    expect(text).toContain(`Forma escolhida: ${label}`);
    expect(text).toContain('Pedido confirmado');
    expect(html).toContain(`<strong>${label}</strong>`);
    expect(html).toContain('Confirmado');
    expect(`${text}${html}`).not.toMatch(/Aguardando pagamento|A combinar|aguarda a confirmação/);
  });
});
