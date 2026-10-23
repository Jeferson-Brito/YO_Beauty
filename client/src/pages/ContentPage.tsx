import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { apiGet } from '../services/api';
import type { DataResponse, StorePage } from '../types/catalog';

export function ContentPage() {
  const { slug } = useParams();
  const page = useQuery({
    queryKey: ['page', slug],
    queryFn: () => apiGet<DataResponse<StorePage>>(`/api/pages/${slug}`),
    enabled: Boolean(slug),
  });

  if (page.isError) return <main className="store-wrap py-16">Página não encontrada.</main>;
  if (!page.data) return <main className="store-wrap py-16">Carregando...</main>;

  return (
    <main className="store-wrap max-w-3xl py-12">
      <h1 className="type-title break-words">{page.data.data.title}</h1>
      <div className="type-body mt-6 space-y-4">
        {page.data.data.content.split('\n\n').map((paragraph) => (
          <p key={paragraph.slice(0, 24)}>{paragraph}</p>
        ))}
      </div>
    </main>
  );
}
