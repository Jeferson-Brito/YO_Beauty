import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { ApiError, apiGet, apiSend } from '../../services/api';
import type { DataResponse, ProductReviews as ReviewsPayload } from '../../types/catalog';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

function StarRow({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => {
        const amount = Math.max(0, Math.min(1, value - (star - 1)));
        return (
          <span key={star} className="relative inline-block h-[18px] w-[18px]">
            <Star size={18} className="text-blush-200" fill="currentColor" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${amount * 100}%` }}>
              <Star size={18} className="absolute top-0 left-0 text-gold-500" fill="currentColor" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota de 1 a 5 estrelas" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}`}
          onMouseEnter={() => setHover(star)}
          onFocus={() => setHover(star)}
          onClick={() => onChange(star)}
          className={`grid h-9 w-9 place-items-center ${shown >= star ? 'text-gold-500' : 'text-blush-200'}`}
        >
          <Star size={22} fill={shown >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

function useReviews(slug: string) {
  return useQuery({
    queryKey: ['reviews', slug],
    enabled: Boolean(slug),
    queryFn: () => apiGet<DataResponse<ReviewsPayload>>(`/api/products/${slug}/reviews`),
  });
}

export function ProductReviewSummary({ slug }: { slug: string }) {
  const reviews = useReviews(slug);
  const summary = reviews.data?.data.summary;
  if (!summary) return null;
  if (summary.count === 0 || summary.average == null) {
    return <p className="mt-3 text-sm text-ink-500">Ainda sem avaliações</p>;
  }
  const label = `Nota ${summary.average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5, ${summary.count} ${summary.count === 1 ? 'avaliação' : 'avaliações'}`;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-700">
      <StarRow value={summary.average} label={label} />
      <span className="font-semibold text-ink-900">
        {summary.average.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </span>
      <span>
        ({summary.count} {summary.count === 1 ? 'avaliação' : 'avaliações'})
      </span>
    </p>
  );
}

export function ProductReviews({ slug }: { slug: string }) {
  const { user } = useShop();
  const queryClient = useQueryClient();
  const reviews = useReviews(slug);
  const payload = reviews.data?.data;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setRating(payload?.mine?.rating ?? 0);
    setComment(payload?.mine?.comment ?? '');
  }, [payload?.mine?.rating, payload?.mine?.comment]);

  const save = useMutation({
    mutationFn: () => apiSend(`/api/products/${slug}/reviews`, 'POST', { rating, comment: comment.trim() }),
    onSuccess: async () => {
      setError('');
      await queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
    },
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível publicar a avaliação.');
    },
  });

  const remove = useMutation({
    mutationFn: (reviewId: string) => apiSend(`/api/products/${slug}/reviews/${reviewId}`, 'DELETE'),
    onSuccess: async () => {
      setRating(0);
      setComment('');
      await queryClient.invalidateQueries({ queryKey: ['reviews', slug] });
    },
  });

  function publish() {
    if (rating < 1) {
      setError('Escolha de 1 a 5 estrelas.');
      return;
    }
    if (comment.trim().length < 2) {
      setError('Escreva um comentário.');
      return;
    }
    save.mutate();
  }

  return (
    <section className="mt-14">
      <h2 className="script-title text-4xl sm:text-5xl">Avaliações</h2>

      {user?.role === 'CLIENT' ? (
        <form
          className="mt-6 max-w-xl rounded-[28px] border border-blush-200 bg-blush-50 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            publish();
          }}
        >
          <p className="text-sm font-semibold text-ink-900">{payload?.mine ? 'Sua avaliação' : 'Avaliar este produto'}</p>
          <div className="mt-3">
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <label className="mt-4 block text-sm text-ink-700">
            Comentário
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={600}
              rows={4}
              placeholder="Conte o que achou, um elogio ou como foi usar."
              className="mt-1 w-full rounded-2xl border border-blush-200 bg-white px-4 py-3 text-sm outline-none focus:border-magenta-400"
            />
          </label>
          {error ? <p className="mt-2 text-sm text-magenta-700">{error}</p> : null}
          <button type="submit" className="btn-cart mt-4 max-w-xs" disabled={save.isPending}>
            {payload?.mine ? 'Atualizar avaliação' : 'Publicar avaliação'}
          </button>
        </form>
      ) : !user ? (
        <p className="mt-6 text-sm text-ink-700">
          <Link to={`/login?next=${encodeURIComponent(`/produto/${slug}`)}`} className="text-link font-semibold">
            Entre na sua conta
          </Link>{' '}
          para comentar e avaliar este produto.
        </p>
      ) : null}

      <ul className="mt-8 space-y-4">
        {payload?.reviews.map((review) => (
          <li key={review.id} className="rounded-[28px] border border-blush-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-ink-900">{review.authorName}</p>
                <p className="text-xs text-ink-500">{dateFormat.format(new Date(review.createdAt))}</p>
              </div>
              <StarRow value={review.rating} label={`${review.rating} de 5 estrelas`} />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-700">{review.comment}</p>
            {review.mine || user?.role === 'ADMIN' ? (
              <button
                type="button"
                className="mt-3 text-xs font-semibold tracking-[0.08em] text-magenta-700 uppercase"
                onClick={() => remove.mutate(review.id)}
              >
                Excluir
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      {payload && payload.reviews.length === 0 ? (
        <p className="mt-6 text-sm text-ink-500">Este produto ainda não recebeu comentários.</p>
      ) : null}
    </section>
  );
}
