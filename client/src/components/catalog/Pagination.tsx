export function Pagination({ page, pageCount, onPage }: { page: number; pageCount: number; onPage: (page: number) => void }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Paginação" className="mt-8 flex items-center justify-center gap-4">
      <button className="page-button" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</button>
      <span className="text-sm text-ink-500" aria-live="polite">{page} de {pageCount}</span>
      <button className="page-button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>Próxima</button>
    </nav>
  );
}

export function readPage(value: string | null) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
