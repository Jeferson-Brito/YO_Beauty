import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, apiGet, apiSend } from '../../services/api';
import type { DataResponse, ListResponse } from '../../types/catalog';
import { formatBRL } from '../../utils/money';
import { paymentMethodLabel } from '../../utils/order-whatsapp';
import { LineThumb } from '../../components/catalog/LineThumb';
import { Notice, PageHeader } from './ui';

type AdminOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalCents: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  address: { street?: string; number?: string; neighborhood?: string; city?: string; state?: string; postalCode?: string };
  items: { id: string; name: string; sku: string; quantity: number; lineTotalCents: number; imageUrl?: string | null; categorySlug?: string; slug?: string }[];
  payment?: { provider?: string | null; status?: string | null } | null;
};

const paymentLabel: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  PAID: 'Pago',
  FAILED: 'Pagamento não concluído',
  REFUNDED: 'Estornado',
  PARTIALLY_REFUNDED: 'Estornado em parte',
  CANCELLED: 'Cancelado',
};

const orderLabel: Record<string, string> = {
  AWAITING_PAYMENT: 'Aguardando pagamento',
  PAID_AWAITING_PROCESSING: 'Pago, aguardando separação',
  PROCESSING: 'Em preparação',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
};

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const orders = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: () => apiGet<ListResponse<AdminOrder>>('/api/admin/orders'),
  });
  const detail = useQuery({
    queryKey: ['admin', 'order', selected],
    enabled: Boolean(selected),
    queryFn: () => apiGet<DataResponse<AdminOrder>>(`/api/admin/orders/${selected}`),
  });

  async function cancel(id: string) {
    setError('');
    try {
      await apiSend(`/api/admin/orders/${id}/cancel`, 'POST');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível cancelar.');
    }
  }

  const order = detail.data?.data;
  const list = orders.data?.data ?? [];

  return (
    <div>
      <PageHeader title="Pedidos" hint="Clique em um pedido para ver o endereço e os itens. Só um pedido ainda sem pagamento pode ser cancelado." />
      {orders.isError ? <Notice>Não foi possível carregar os pedidos.</Notice> : null}
      <div className="space-y-3">
        {list.map((item) => {
          const open = selected === item.id;
          return (
            <article key={item.id} className={`overflow-hidden rounded-[1.75rem] border bg-white shadow-sm ${open ? 'border-magenta-400' : 'border-blush-200'}`}>
              <button type="button" className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 text-left hover:bg-blush-50 sm:px-5" onClick={() => setSelected(open ? null : item.id)}>
                <span>
                  <span className="block font-medium text-ink-900">{item.orderNumber}</span>
                  <span className="mt-0.5 block text-sm text-ink-500">{item.customerName} · {new Date(item.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold text-price">{formatBRL(item.totalCents)}</span>
                  <StatusChip status={item.paymentStatus} label={paymentLabel[item.paymentStatus] ?? item.paymentStatus} />
                </span>
              </button>
              {open ? (
                <div className="border-t border-blush-100 px-4 py-4 text-sm sm:px-5">
                  {!order ? <p className="text-ink-500">Carregando pedido...</p> : null}
                  {order && order.id === item.id ? (
                    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
                      <div>
                        <ul className="divide-y divide-blush-100">
                          {order.items.map((line) => (
                            <li key={line.id} className="flex items-center gap-3 py-2.5">
                              <LineThumb name={line.name} imageUrl={line.imageUrl} categorySlug={line.categorySlug} />
                              <span className="min-w-0 flex-1">{line.quantity}× {line.name}</span>
                              <span className="font-medium text-price">{formatBRL(line.lineTotalCents)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-3 text-right text-lg font-semibold text-price">Total {formatBRL(order.totalCents)}</p>
                      </div>
                      <div className="rounded-2xl bg-blush-50 p-4">
                        <p className="font-medium text-ink-900">{order.customerName}</p>
                        <p className="mt-1 text-ink-500">{order.customerEmail}</p>
                        <p className="text-ink-500">{order.customerPhone}</p>
                        <p className="mt-3 text-ink-700">
                          {order.address.street}, {order.address.number}
                          <br />
                          {order.address.neighborhood} · {order.address.city}/{order.address.state}
                          <br />
                          {order.address.postalCode}
                        </p>
                        <p className="mt-3 text-ink-500">Pagamento: {paymentMethodLabel(order.payment?.provider) || 'ainda não informado'}</p>
                        <p className="text-ink-500">Situação: {orderLabel[order.orderStatus] ?? order.orderStatus}</p>
                        {order.paymentStatus === 'PENDING' ? (
                          <button type="button" className="mt-4 text-sm text-magenta-700" onClick={() => void cancel(order.id)}>
                            Cancelar e devolver o estoque
                          </button>
                        ) : null}
                        {error ? <div className="mt-3"><Notice>{error}</Notice></div> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
        {orders.data && list.length === 0 ? <p className="text-sm text-ink-500">Nenhum pedido ainda.</p> : null}
      </div>
    </div>
  );
}

function StatusChip({ status, label }: { status: string; label: string }) {
  const tone = status === 'CANCELLED' ? 'bg-zinc-100 text-zinc-500' : status === 'PAID' ? 'bg-blush-100 text-magenta-700' : 'bg-gold-300/40 text-gold-700';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase ${tone}`}>{label}</span>;
}
