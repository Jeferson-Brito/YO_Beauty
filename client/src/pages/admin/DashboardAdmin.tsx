import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, apiGet } from '../../services/api';
import { formatBRL } from '../../utils/money';
import { Notice, Panel } from './ui';

type Metric = { revenueCents: number; change: number | null };
type Rank = { name: string; quantity: number; revenueCents: number };
type Dashboard = {
  period: { referenceDate: string };
  cards: { day: Metric; week: Metric; month: Metric; total: Metric };
  summary: {
    revenueCents: number;
    revenueChange: number | null;
    paidOrders: number;
    averageTicketCents: number;
    ticketChange: number | null;
    createdOrders: number;
    pendingPayment: number;
    cancelled: number;
    processing: number;
    refunded: number;
    registeredCustomers: number;
    newCustomers: number;
    buyers: number;
    recurringCustomers: number;
    recurringInPeriod: number;
    visitors: number;
    sessions: number;
    pageViews: number;
    conversion: number | null;
  };
  series: { date: string; revenueCents: number; paidOrders: number }[];
  productsByQuantity: Rank[];
  productsByRevenue: Rank[];
  categories: Rank[];
  loyalty: {
    segments: Record<string, number>;
    averageDaysBetweenPurchases: number | null;
  };
  stock: { low: { name: string; sku: string; stockQuantity: number }[]; out: { name: string; sku: string; stockQuantity: number }[] };
};

const periods = [
  ['today', 'Hoje'],
  ['yesterday', 'Ontem'],
  ['last_7_days', 'Últimos 7 dias'],
  ['last_30_days', 'Últimos 30 dias'],
  ['current_week', 'Semana atual'],
  ['previous_week', 'Semana anterior'],
  ['current_month', 'Mês atual'],
  ['previous_month', 'Mês anterior'],
  ['last_3_months', 'Últimos 3 meses'],
  ['last_6_months', 'Últimos 6 meses'],
  ['last_12_months', 'Últimos 12 meses'],
  ['custom', 'Personalizado'],
] as const;

const segmentLabel: Record<string, string> = {
  NEW: 'Novo',
  FIRST_PURCHASE: 'Primeira compra',
  RECURRING: 'Recorrente',
  VIP: 'VIP',
  INACTIVE: 'Inativo',
};

function changeLabel(value: number | null) {
  if (value == null) return 'sem base anterior';
  const formatted = `${value > 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%`;
  return formatted;
}

export function DashboardPage() {
  const [preset, setPreset] = useState<(typeof periods)[number][0]>('last_30_days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportError, setExportError] = useState('');
  const query = new URLSearchParams({ preset });
  if (preset === 'custom' && startDate && endDate) {
    query.set('startDate', startDate);
    query.set('endDate', endDate);
  }
  const report = useQuery({
    queryKey: ['admin', 'dashboard', query.toString()],
    enabled: preset !== 'custom' || Boolean(startDate && endDate),
    queryFn: () => apiGet<{ data: Dashboard }>(`/api/admin/dashboard?${query.toString()}`),
  });
  const data = report.data?.data;

  async function download() {
    setExportError('');
    try {
      const response = await fetch(`/api/admin/dashboard.csv?${query.toString()}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Falha ao exportar.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'yo-beauty-indicadores.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof ApiError ? error.message : 'Não foi possível exportar o CSV.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-magenta-700">Indicadores</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-500">
            O faturamento usa somente pedidos pagos. Pendente não é venda. A confirmação real depende do gateway, que ainda não está ligado.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            Período
            <select className="field mt-1 rounded-2xl bg-white" value={preset} onChange={(event) => setPreset(event.target.value as (typeof periods)[number][0])}>
              {periods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {preset === 'custom' ? (
            <>
              <label className="text-sm">Início<input type="date" className="field mt-1" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
              <label className="text-sm">Fim<input type="date" className="field mt-1" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>
            </>
          ) : null}
          <button type="button" className="btn-cart max-w-40" onClick={() => void download()}>
            Exportar CSV
          </button>
        </div>
      </div>
      {exportError ? <Notice>{exportError}</Notice> : null}
      {report.isError ? <Notice>Não foi possível carregar os indicadores.</Notice> : null}
      {data ? <Report data={data} /> : <p className="text-sm text-ink-500">Carregando indicadores...</p>}
    </div>
  );
}

function Report({ data }: { data: Dashboard }) {
  const max = Math.max(...data.series.map((row) => row.revenueCents), 1);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Dia" metric={data.cards.day} />
        <Card title="Semana" metric={data.cards.week} />
        <Card title="Mês" metric={data.cards.month} />
        <Card title="Faturamento total" metric={data.cards.total} />
      </div>
      <Panel title="Faturamento no período">
        <p className="text-sm text-ink-500">Referência {data.period.referenceDate}. Variação do período: {changeLabel(data.summary.revenueChange)}.</p>
        <div className="mt-4 flex h-36 items-end gap-1">
          {data.series.map((row) => (
            <div key={row.date} className="group flex h-full flex-1 items-end" title={`${row.date}: ${formatBRL(row.revenueCents)}`}>
              <div className="w-full rounded-t bg-magenta-500" style={{ height: `${Math.max(2, (row.revenueCents / max) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-blush-50 p-3 text-sm">
            <p className="font-medium text-magenta-700">Vendas</p>
            <p className="mt-2">Pedidos pagos: {data.summary.paidOrders}</p>
            <p>Ticket médio: {formatBRL(data.summary.averageTicketCents)} ({changeLabel(data.summary.ticketChange)})</p>
            <p>Pedidos criados: {data.summary.createdOrders}</p>
            <p>Pendentes: {data.summary.pendingPayment}</p>
            <p>Cancelados: {data.summary.cancelled}</p>
            <p>Em preparação: {data.summary.processing}</p>
            <p>Estornados: {data.summary.refunded}</p>
          </div>
          <div className="rounded-2xl bg-blush-50 p-3 text-sm">
            <p className="font-medium text-magenta-700">Clientes</p>
            <p className="mt-2">Cadastrados: {data.summary.registeredCustomers}</p>
            <p>Novos no mês: {data.summary.newCustomers}</p>
            <p>Com compra no período: {data.summary.buyers}</p>
            <p>Recorrentes: {data.summary.recurringCustomers}</p>
            <p>Recorrentes no período: {data.summary.recurringInPeriod}</p>
          </div>
          <div className="rounded-2xl bg-blush-50 p-3 text-sm">
            <p className="font-medium text-magenta-700">Visitas</p>
            <p className="mt-2">Visitantes: {data.summary.visitors}</p>
            <p>Sessões: {data.summary.sessions}</p>
            <p>Visualizações: {data.summary.pageViews}</p>
            <p>Conversão: {data.summary.conversion == null ? 'sem visitas registradas' : `${(data.summary.conversion * 100).toFixed(1).replace('.', ',')}%`}</p>
          </div>
        </div>
        {data.summary.conversion != null && data.summary.conversion > 1 ? (
          <p className="mt-3 text-xs text-ink-500">A conversão passou de 100% porque há compra sem visita identificada neste navegador. O número fica assim, sem teto artificial.</p>
        ) : null}
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <RankList title="Mais vendidos" rows={data.productsByQuantity} />
        <RankList title="Maior faturamento" rows={data.productsByRevenue} />
        <RankList title="Categorias" rows={data.categories} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Fidelização">
          <ul className="space-y-1 text-sm">
            {Object.entries(data.loyalty.segments).map(([segment, count]) => (
              <li key={segment} className="flex justify-between"><span>{segmentLabel[segment] ?? segment}</span><span>{count}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-500">
            Tempo médio entre compras: {data.loyalty.averageDaysBetweenPurchases == null ? 'ainda não há duas compras' : `${data.loyalty.averageDaysBetweenPurchases.toFixed(1).replace('.', ',')} dias`}
          </p>
        </Panel>
        <Panel title="Estoque">
          <p className="text-sm font-medium">Baixo</p>
          <ul className="mt-1 text-sm text-ink-700">
            {data.stock.low.map((item) => <li key={item.sku}>{item.name} · {item.stockQuantity}</li>)}
            {data.stock.low.length === 0 ? <li>Nenhum item no limite.</li> : null}
          </ul>
          <p className="mt-3 text-sm font-medium">Sem estoque</p>
          <ul className="mt-1 text-sm text-ink-700">
            {data.stock.out.map((item) => <li key={item.sku}>{item.name}</li>)}
            {data.stock.out.length === 0 ? <li>Nenhum item esgotado.</li> : null}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Card({ title, metric }: { title: string; metric: Metric }) {
  return (
    <section className="rounded-[1.5rem] border border-blush-200 bg-white p-4 shadow-sm">
      <p className="text-xs tracking-[0.14em] text-ink-500 uppercase">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-price">{formatBRL(metric.revenueCents)}</p>
      <p className="text-xs text-ink-500">{changeLabel(metric.change)}</p>
    </section>
  );
}

function RankList({ title, rows }: { title: string; rows: Rank[] }) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? <p className="text-sm text-ink-500">Sem venda paga neste período.</p> : null}
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.name} className="flex justify-between gap-3">
            <span>{row.name}</span>
            <span>{row.quantity} · {formatBRL(row.revenueCents)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
