import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/catalog/ProductCard';
import { BrandArt } from '../components/visuals/BrandArt';
import { useHome } from '../context/ShopContext';
import type { CategoryCard, StoreBanner } from '../types/catalog';

export function HomePage() {
  const home = useHome();
  const data = home.data?.data;
  if (!data) return null;

  const hero = data.banners.find((banner) => banner.position === 'hero');
  const leftPromo = data.banners.find((banner) => banner.position === 'promo-left');
  const rightPromo = data.banners.find((banner) => banner.position === 'promo-right');
  const featured = data.sections.find((section) => section.placement === 'home-grid') ?? data.sections[0];
  const blocks = data.sections.filter((section) => section.placement === 'home-block');

  return (
    <main>
      <Hero banner={hero} />
      <section className="store-wrap py-6">
        <div className="mb-8 flex items-center justify-center gap-6">
          <span className="hidden h-px w-16 bg-blush-200 sm:block" />
          <div className="text-center">
            <h2 className="type-title">Categorias</h2>
            <p className="type-note mt-3">Encontre tudo o que você precisa</p>
          </div>
          <span className="hidden h-px w-16 bg-blush-200 sm:block" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {data.homeCategories.map((category) => (
            <Link key={category.id} to={`/categoria/${category.slug}`} className="group text-center">
              <div className="overflow-hidden rounded-2xl border border-blush-200 bg-white shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:border-magenta-400 group-hover:shadow-md">
                <div className="aspect-[4/3]">
                  <CategoryRotator category={category} />
                </div>
              </div>
              <span className="type-kicker mt-3 inline-flex items-center gap-1 text-ink-700 group-hover:text-magenta-600">
                {category.name} <span aria-hidden="true">›</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      {featured ? (
        <section className="store-wrap py-10">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <h2 className="type-section">{featured.title}</h2>
            <span className="mb-3 hidden h-px flex-1 bg-blush-200 sm:block" />
            {featured.buttonUrl ? (
              <Link to={featured.buttonUrl} className="text-link text-xs font-semibold tracking-[0.16em] uppercase sm:mb-2">
                {featured.buttonText || 'Ver todos'}
              </Link>
            ) : null}
          </div>
          <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {featured.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
      <section className="store-wrap grid gap-4 py-6 lg:grid-cols-2">
        {leftPromo ? <PromoBanner banner={leftPromo} align="left" slug="kits" /> : null}
        {rightPromo ? <PromoBanner banner={rightPromo} align="right" slug="lancamentos" /> : null}
      </section>
      {blocks.map((section) => (
        <section key={section.id} className="store-wrap py-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-4">
            <h2 className="type-section">{section.title}</h2>
            <span className="mb-3 hidden h-px flex-1 bg-blush-200 sm:block" />
            {section.buttonUrl ? (
              <Link to={section.buttonUrl} className="text-link text-xs font-semibold tracking-[0.16em] uppercase sm:mb-2">
                {section.buttonText || 'Ver todos'}
              </Link>
            ) : null}
          </div>
          {section.subtitle ? <p className="type-body mb-4">{section.subtitle}</p> : null}
          {section.products.length === 0 ? (
            <p className="text-sm text-ink-500">Esta seção ainda não tem produtos.</p>
          ) : (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {section.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      ))}
    </main>
  );
}

function CategoryRotator({ category }: { category: CategoryCard }) {
  const photos = category.productImageUrls ?? [];
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduceMotion || photos.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => current + 1), 4200);
    return () => window.clearInterval(timer);
  }, [photos.length, reduceMotion]);

  useEffect(() => {
    if (index < photos.length) return;
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setIndex(0);
      requestAnimationFrame(() => setAnimate(true));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [index, photos.length]);

  if (photos.length === 0) {
    return <BrandArt slug={category.slug} label={category.name} imageUrl={category.imageUrl} alt="" />;
  }

  const slides = photos.length > 1 && !reduceMotion ? [...photos, photos[0]] : [photos[0]];
  const active = reduceMotion ? 0 : Math.min(index, slides.length - 1);

  return (
    <div className="h-full overflow-hidden bg-white">
      <div
        className={`flex h-full ${animate && !reduceMotion ? 'transition-transform duration-700 ease-out' : ''}`}
        style={{ width: `${slides.length * 100}%`, transform: `translateX(-${(active * 100) / slides.length}%)` }}
      >
        {slides.map((src, photoIndex) => (
          <div key={`${src}-${photoIndex}`} className="h-full px-3 py-2" style={{ width: `${100 / slides.length}%` }}>
            <img src={src} alt="" className="h-full w-full object-contain" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero({ banner }: { banner?: StoreBanner }) {
  const background = banner?.imageUrl || '/home/hero-fundo.jpg';
  return (
    <section className="store-wrap pt-4">
      <div className="relative min-h-[400px] overflow-hidden rounded-[28px] bg-magenta-600 text-white shadow-lg sm:min-h-[440px] lg:min-h-[480px]">
        <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_center] sm:object-right" />
        <div className="absolute inset-0 bg-gradient-to-r from-magenta-900/85 via-magenta-800/55 to-magenta-900/10 sm:from-magenta-900/55 sm:via-magenta-700/15 sm:to-transparent" />
        <div className="relative z-10 flex min-h-[400px] max-w-xl flex-col justify-center px-5 py-8 sm:min-h-[440px] sm:px-12 sm:py-12 lg:min-h-[480px]">
          <p className="text-balance text-[10px] tracking-[0.14em] text-gold-300 uppercase sm:text-xs sm:tracking-[0.22em]">
            {banner?.eyebrow || 'Beleza, autocuidado e confiança em um só lugar'}
          </p>
          <img src="/brand/logo-horizontal.png" alt="Yo Beauty" className="mt-4 h-auto w-full max-w-[420px] sm:max-w-[520px]" />
          <p className="type-lead mt-2 text-balance text-white">{banner?.subtitle || 'Mais beleza para o seu dia a dia'} ♥</p>
          <Link
            to={banner?.buttonUrl || '/produtos'}
            className="outline-light mt-6 inline-flex w-fit items-center gap-3 rounded-full border border-white/80 px-6 py-2.5 text-xs font-semibold tracking-[0.18em] uppercase"
          >
            {banner?.buttonText || 'Compre agora'} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function PromoBanner({ banner, align, slug }: { banner: StoreBanner; align: 'left' | 'right'; slug: string }) {
  const photo = banner.imageUrl || (slug === 'kits' ? '/home/card-kits.jpg' : '/home/card-lancamentos.jpg');
  const imageOnRight = align === 'left';
  return (
    <article className="relative overflow-hidden rounded-[28px] bg-[#de2c5e] text-white sm:min-h-64">
      <div className="relative sm:static">
        <img
          src={photo}
          alt={banner.altText || banner.title}
          className={`h-44 w-full object-cover sm:absolute sm:inset-y-0 sm:h-full ${imageOnRight ? 'object-[72%_center] sm:right-0 sm:w-[58%]' : 'promo-mouth object-[18%_center] sm:left-0 sm:w-[42%] sm:object-[22%_center]'}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-b from-transparent to-[#de2c5e] sm:hidden" />
      </div>
      {imageOnRight ? (
        <div className="absolute inset-y-0 right-0 hidden w-[58%] bg-[linear-gradient(to_right,#de2c5e_0%,#de2c5e_18%,rgba(222,44,94,0.45)_48%,transparent_76%)] sm:block" />
      ) : null}
      <div className={`relative z-10 flex flex-col items-center justify-center px-6 py-6 text-center sm:absolute sm:inset-y-0 sm:px-5 ${imageOnRight ? 'sm:left-0 sm:w-[50%]' : 'sm:right-0 sm:w-[54%]'}`}>
        <p className="text-xs font-semibold tracking-[0.16em] uppercase sm:text-base">{banner.eyebrow || banner.title}</p>
        <p className="type-title mt-1 flex w-full items-center justify-center text-center text-[2.35rem] text-balance !text-white sm:min-h-32 sm:text-[2.65rem]">{banner.title}</p>
        {banner.subtitle ? <p className="mt-2 text-sm text-white/85">{banner.subtitle}</p> : null}
        {banner.buttonUrl ? (
          <Link to={banner.buttonUrl} className="outline-light mt-4 inline-flex rounded-full border border-white/85 px-5 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase sm:mt-3">
            {banner.buttonText} →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
