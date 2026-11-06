import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../../services/api';
import type { AdminSettings } from '../../types/admin';
import type { DataResponse, ListResponse } from '../../types/catalog';
import { printOrder, writeReceipt, type PrintableOrder } from '../../utils/print-order';

type ListedOrder = PrintableOrder & { id: string };

export function AutoPrintOrders() {
  const frame = useRef<HTMLIFrameElement>(null);
  const seen = useRef(new Set<string>());
  const primed = useRef(false);
  const [waiting, setWaiting] = useState<ListedOrder | null>(null);
  const settings = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiGet<DataResponse<AdminSettings>>('/api/admin/settings'),
    refetchInterval: 30_000,
  });
  const enabled = Boolean(settings.data?.data.autoPrintOrders);
  const orders = useQuery({
    queryKey: ['admin', 'orders', 'auto-print'],
    queryFn: () => apiGet<ListResponse<ListedOrder>>('/api/admin/orders?pageSize=10'),
    enabled,
    refetchInterval: enabled ? 12_000 : false,
  });

  useEffect(() => {
    if (!enabled) {
      primed.current = false;
      return;
    }
    const list = orders.data?.data;
    if (!list || waiting) return;
    if (!primed.current) {
      for (const order of list) seen.current.add(order.id);
      primed.current = true;
      return;
    }
    const next = [...list].reverse().find((order) => !seen.current.has(order.id));
    if (!next) return;
    seen.current.add(next.id);
    const target = frame.current?.contentWindow;
    if (target) {
      writeReceipt(target.document, next);
      window.setTimeout(() => {
        target.focus();
        target.print();
      }, 200);
    }
    setWaiting(next);
  }, [enabled, orders.data, waiting]);

  useEffect(() => {
    if (!waiting) return;
    const timer = window.setTimeout(() => setWaiting(null), 8000);
    return () => window.clearTimeout(timer);
  }, [waiting]);

  if (!enabled && !waiting) return null;

  return (
    <div className="mb-4 space-y-2">
      {enabled ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-sm text-ink-700 shadow-sm">
          Impressão automática ligada. Deixe este painel aberto no computador da MPT-2.
        </p>
      ) : null}
      {waiting ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-magenta-600 px-4 py-3 text-sm text-white">
          <p>Novo pedido {waiting.orderNumber}. Se a janela de impressão não abriu, use o botão.</p>
          <button type="button" className="rounded-full bg-white px-4 py-2 font-medium text-magenta-700" onClick={() => printOrder(waiting)}>
            Imprimir agora
          </button>
        </div>
      ) : null}
      <iframe ref={frame} title="Impressão do pedido" className="pointer-events-none fixed top-0 left-0 h-px w-px opacity-0" />
    </div>
  );
}
