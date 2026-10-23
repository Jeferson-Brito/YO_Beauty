import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="store-wrap py-20 text-center">
      <h1 className="script-title text-4xl sm:text-6xl">Página não encontrada</h1>
      <p className="mt-3 text-sm text-ink-500">O endereço não corresponde a uma página da loja.</p>
      <Link to="/" className="btn-cart mx-auto mt-6 max-w-xs">
        Voltar ao início
      </Link>
    </main>
  );
}
