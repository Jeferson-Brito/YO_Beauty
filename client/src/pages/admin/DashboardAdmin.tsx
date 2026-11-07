import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Download, Package, ShoppingBag, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, apiGet } from '../../services/api';
import { formatBRL } from '../../utils/money';
import { Notice, Panel, PageHeader } from './ui';

type Metric = { revenueCents: number; change: number | null };
type Rank = { name: string; quantity: number; revenueCents: number };
type Dashboard = {
  period: { referenceDate: string };
  cards: { day: Metric; week: Metric; month: Metric; total: Metric };
  summary: {
    revenueCents: number;
    revenueChange: number | null;
    confirmedOrders: number;
    averageTicketCents: number;
    ticketChange: number | null;
    createdOrders: number;
    cancelled: number;
    processing: number;
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
  series: { date: string; revenueCents: number; confirmedOrders: number }[];
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
      <PageHeader title="Visão geral" hint="Um olhar sobre seus pedidos, clientes e os resultados da loja." action={<Link to="/admin/produtos/novo" className="btn-cart w-auto gap-2 px-5"><Package size={15} /> Novo produto</Link>} />
      <div className="admin-filter-bar flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3"><span className="admin-icon-tile"><CalendarDays size={19} /></span><div><p className="text-sm font-semibold">Seus resultados</p><p className="mt-1 text-xs text-ink-500">Escolha o período que deseja acompanhar</p></div></div>
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
          <button type="button" className="admin-secondary-button" disabled={!data || report.isFetching} onClick={() => void download()}>
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>
      {exportError ? <Notice>{exportError}</Notice> : null}
      {report.isError ? <Notice>Não foi possível carregar os indicadores.</Notice> : null}
      {data ? <Report data={data} /> : !report.isError ? <p role="status" className="admin-panel rounded-2xl bg-white p-8 text-sm text-ink-500">{preset === 'custom' && (!startDate || !endDate) ? 'Selecione as datas de início e fim para ver seus resultados.' : 'Carregando indicadores...'}</p> : null}
    </div>
  );
}

function Report({ data }: { data: Dashboard }) {
  const max = Math.max(...data.series.map((row) => row.revenueCents), 1);
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Dia de referência" metric={data.cards.day} icon={ShoppingBag} />
        <Card title="Semana de referência" metric={data.cards.week} icon={CalendarDays} />
        <Card title="Mês de referência" metric={data.cards.month} icon={BarChart3} />
        <Card title="Faturamento total" metric={data.cards.total} icon={Users} />
      </div>
      <Panel title="Faturamento no período">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-3xl font-semibold tracking-tight text-ink-900">{formatBRL(data.summary.revenueCents)}</p><p className="mt-2 text-xs text-ink-500">Referência {data.period.referenceDate} · {changeLabel(data.summary.revenueChange)}</p></div><span className="order-status">Vendas não canceladas</span></div>
        {data.series.some(row => row.revenueCents > 0) ? <div className="admin-revenue-chart mt-6 flex h-48 items-end gap-1" role="img" aria-label={`Faturamento no período: ${formatBRL(data.summary.revenueCents)}`}>
          {data.series.map(row => <div key={row.date} className="group flex h-full min-w-0 flex-1 items-end" title={`${row.date}: ${formatBRL(row.revenueCents)}`}><div className="revenue-bar w-full rounded-t-md" style={{ height: `${(row.revenueCents / max) * 100}%` }} /></div>)}
        </div> : <div className="admin-chart-empty my-6"><BarChart3 size={30} strokeWidth={1.25} /><p className="mt-3 text-sm font-medium text-ink-700">Seus resultados começam aqui</p><p className="mt-1 text-xs text-ink-500">Ainda não há vendas confirmadas neste período.</p></div>}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="admin-summary-block rounded-xl p-4 text-sm">
            <p className="font-medium text-magenta-700">Vendas</p>
            <p className="mt-2">Vendas confirmadas: {data.summary.confirmedOrders}</p>
            <p>Ticket médio: {formatBRL(data.summary.averageTicketCents)} ({changeLabel(data.summary.ticketChange)})</p>
            <p>Pedidos criados: {data.summary.createdOrders}</p>
            <p>Cancelados: {data.summary.cancelled}</p>
            <p>Em preparação: {data.summary.processing}</p>
          </div>
          <div className="admin-summary-block rounded-xl p-4 text-sm">
            <p className="font-medium text-magenta-700">Clientes</p>
            <p className="mt-2">Cadastrados: {data.summary.registeredCustomers}</p>
            <p>Novos no mês: {data.summary.newCustomers}</p>
            <p>Com compra no período: {data.summary.buyers}</p>
            <p>Recorrentes: {data.summary.recurringCustomers}</p>
            <p>Recorrentes no período: {data.summary.recurringInPeriod}</p>
          </div>
          <div className="admin-summary-block rounded-xl p-4 text-sm">
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

function Card({ title, metric, icon: Icon }: { title: string; metric: Metric; icon: typeof ShoppingBag }) {
  const Trend = metric.change != null && metric.change < 0 ? ArrowDownRight : ArrowUpRight;
  return <section className="admin-metric-card"><div className="flex items-center justify-between gap-2"><p className="text-[11px] font-medium text-ink-500">{title}</p><span className="admin-icon-tile"><Icon size={17} /></span></div><p className="mt-5 text-[1.7rem] font-semibold tracking-tight text-ink-900">{formatBRL(metric.revenueCents)}</p><p className={`mt-3 inline-flex items-center gap-1 text-[11px] ${metric.change != null && metric.change > 0 ? 'text-emerald-700' : 'text-ink-500'}`}>{metric.change != null ? <Trend size={13} /> : null}{changeLabel(metric.change)}</p></section>;
}

function RankList({ title, rows }: { title: string; rows: Rank[] }) {
  return (
    <Panel title={title}>
      {rows.length === 0 ? <p className="text-sm text-ink-500">Sem vendas confirmadas neste período.</p> : null}
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.name} className="flex items-start justify-between gap-4 border-b border-blush-100 py-3 last:border-0">
            <span>{row.name}</span>
            <span className="shrink-0 text-right text-xs leading-5"><strong className="block font-semibold text-ink-900">{formatBRL(row.revenueCents)}</strong><span className="text-ink-500">{row.quantity} un.</span></span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
