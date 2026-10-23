type ArtProps = {
  slug?: string;
  label: string;
  imageUrl?: string | null;
  alt?: string;
  className?: string;
  fit?: 'cover' | 'contain';
};

const scenes: Record<string, { a: string; b: string; shape: 'palette' | 'bottles' | 'hair' | 'bag' | 'gift' | 'spark' | 'tube' }> = {
  maquiagem: { a: '#f7b6cf', b: '#e21870', shape: 'palette' },
  skincare: { a: '#f8c9da', b: '#d4568c', shape: 'bottles' },
  cabelos: { a: '#f3b7cc', b: '#c73b78', shape: 'hair' },
  acessorios: { a: '#f8d0e0', b: '#e21870', shape: 'bag' },
  kits: { a: '#f6c1d6', b: '#c41262', shape: 'gift' },
  lancamentos: { a: '#f8bfd4', b: '#e21870', shape: 'spark' },
  perfumes: { a: '#f7c6d8', b: '#b01a5c', shape: 'bottles' },
  unhas: { a: '#f8d5e4', b: '#e21870', shape: 'tube' },
  'corpo-e-banho': { a: '#f6d0e0', b: '#d4568c', shape: 'bottles' },
  promocoes: { a: '#f8c3d8', b: '#c41262', shape: 'spark' },
};

export function BrandArt({ slug, label, imageUrl, alt, className = '', fit = 'cover' }: ArtProps) {
  if (imageUrl) {
    return <img src={imageUrl} alt={alt || label} className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`} />;
  }

  const scene = scenes[slug ?? ''] ?? { a: '#f8d0e0', b: '#e21870', shape: 'spark' as const };
  return (
    <svg viewBox="0 0 320 240" role="img" aria-label={`${label}. Imagem ainda não cadastrada.`} className={`h-full w-full ${className}`}>
      <rect width="320" height="240" fill="#fff5f8" />
      <rect x="28" y="28" width="264" height="184" rx="28" fill={scene.a} />
      <circle cx="210" cy="78" r="36" fill="#fff" opacity="0.45" />
      {scene.shape === 'palette' ? <Palette accent={scene.b} /> : null}
      {scene.shape === 'bottles' ? <Bottles accent={scene.b} /> : null}
      {scene.shape === 'hair' ? <Hair accent={scene.b} /> : null}
      {scene.shape === 'bag' ? <Bag accent={scene.b} /> : null}
      {scene.shape === 'gift' ? <Gift accent={scene.b} /> : null}
      {scene.shape === 'spark' ? <Spark accent={scene.b} /> : null}
      {scene.shape === 'tube' ? <Tube accent={scene.b} /> : null}
    </svg>
  );
}

function Palette({ accent }: { accent: string }) {
  return (
    <g>
      <rect x="78" y="78" width="150" height="96" rx="18" fill="#fff" />
      <circle cx="112" cy="116" r="14" fill={accent} />
      <circle cx="148" cy="108" r="14" fill="#f3a0c0" />
      <circle cx="184" cy="116" r="14" fill="#d4b36a" />
      <circle cx="130" cy="146" r="14" fill="#f7c1d4" />
      <circle cx="168" cy="146" r="14" fill={accent} opacity="0.7" />
    </g>
  );
}

function Bottles({ accent }: { accent: string }) {
  return (
    <g>
      <rect x="108" y="70" width="36" height="92" rx="16" fill="#fff" />
      <rect x="118" y="58" width="16" height="16" rx="4" fill={accent} />
      <rect x="156" y="86" width="46" height="76" rx="18" fill={accent} />
      <rect x="168" y="74" width="22" height="16" rx="6" fill="#fff" />
    </g>
  );
}

function Hair({ accent }: { accent: string }) {
  return (
    <g fill="none" stroke={accent} strokeWidth="10" strokeLinecap="round">
      <path d="M110 150c20-48 40-48 52-8" />
      <path d="M150 142c18-40 42-36 50 6" />
      <path d="M188 146c16-34 36-28 42 10" />
    </g>
  );
}

function Bag({ accent }: { accent: string }) {
  return (
    <g>
      <path d="M118 96h84l10 78H108l10-78z" fill={accent} />
      <path d="M136 96c0-18 12-30 24-30s24 12 24 30" fill="none" stroke="#d4b36a" strokeWidth="6" />
    </g>
  );
}

function Gift({ accent }: { accent: string }) {
  return (
    <g>
      <rect x="104" y="104" width="112" height="72" rx="8" fill={accent} />
      <rect x="150" y="104" width="16" height="72" fill="#d4b36a" />
      <path d="M160 104c-18-28-42-8-22 8h22c20-16-4-36-22-8z" fill="#fff" />
    </g>
  );
}

function Spark({ accent }: { accent: string }) {
  return (
    <g fill={accent}>
      <path d="M160 62l10 28 28 10-28 10-10 28-10-28-28-10 28-10z" />
      <circle cx="214" cy="150" r="16" fill="#d4b36a" />
    </g>
  );
}

function Tube({ accent }: { accent: string }) {
  return (
    <g>
      <rect x="132" y="64" width="42" height="108" rx="20" fill={accent} />
      <rect x="140" y="78" width="26" height="48" rx="12" fill="#fff" opacity="0.85" />
    </g>
  );
}

export function HeroShowcase() {
  return (
    <div className="relative ml-auto h-[340px] w-full max-w-md" aria-hidden="true">
      <div className="absolute top-6 right-2 h-64 w-48 rounded-[2.2rem] bg-white/10 shadow-[0_20px_50px_rgba(80,0,40,0.25)]">
        <span className="absolute -top-3 left-8 h-8 w-14 rounded-t-full border-4 border-gold-300 border-b-0" />
        <span className="absolute -top-3 right-8 h-8 w-14 rounded-t-full border-4 border-gold-300 border-b-0" />
        <span className="absolute top-16 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full border-4 border-gold-300" />
        <span className="absolute top-24 left-1/2 -translate-x-1/2 font-script text-3xl text-gold-300">Yo</span>
      </div>
      <span className="absolute bottom-8 left-6 h-28 w-10 rounded-full bg-white/85" />
      <span className="absolute bottom-6 left-20 h-36 w-12 rounded-full bg-[#ff5b97]" />
      <span className="absolute right-0 bottom-4 h-16 w-16 rounded-full bg-[#ffd0e2]" />
    </div>
  );
}
