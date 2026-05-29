import { useState, useEffect } from 'react';
import { productsApi, sellersApi } from '../api/client';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { fmt, SkeletonCard } from '../components/ui';
import Icon from '../components/Icon';

const HERO_SLIDES = [
  { title:'MEGA PROMO', sub:'Jusqu\'à -70%', desc:'Électronique, Mode & Maison', cta:'Acheter', cat:'electronics', bg:'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)', emoji:'🎉' },
  { title:'Nouveautés Tech', sub:'Derniers gadgets', desc:'iPhone 15, Galaxy S24, MacBook M3', cta:'Découvrir', cat:'electronics', bg:'linear-gradient(135deg,#2563EB 0%,#3B82F6 100%)', emoji:'📱' },
  { title:'Livraison Express', sub:'Demain avant 22h', desc:'Sur les commandes > 200 DT', cta:'Commencer', cat:null, bg:'linear-gradient(135deg,#3B82F6 0%,#60A5FA 100%)', emoji:'🚚' },
];
// Catégories chargées dynamiquement depuis l'API


const HeroBanner = () => {
  const { navigate } = useApp();
  const [slide, setSlide] = useState(0);
  const [time, setTime] = useState({ h:11, m:32, s:45 });
  useEffect(() => {
    const t = setInterval(() => setSlide(s => (s+1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setTime(p => {
      let s=p.s-1,m=p.m,h=p.h;
      if(s<0){s=59;m--;} if(m<0){m=59;h--;} if(h<0){h=23;}
      return {h,m,s};
    }), 1000);
    return () => clearInterval(t);
  }, []);
  const s = HERO_SLIDES[slide];
  return (
    <div className="relative overflow-hidden rounded-2xl mx-4 mt-4 h-80" style={{ background: s.bg }}>
      <div className="max-w-[1400px] mx-auto h-full flex items-center justify-between px-12">
        <div className="text-white max-w-xl anim-fadeIn" key={slide}>
          <div className="inline-block bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold mb-3">{s.title}</div>
          <h1 className="text-5xl font-extrabold mb-3 text-shadow">{s.sub}</h1>
          <p className="text-lg opacity-90 mb-4">{s.desc}</p>
          <div className="flex items-center gap-2 mb-5">
            {[time.h, time.m, time.s].map((v, i) => (
              <span key={i} className="bg-white/15 backdrop-blur rounded-lg px-3 py-2 min-w-[52px] text-center">
                <div className="text-2xl font-bold">{String(v).padStart(2,'0')}</div>
                <div className="text-[10px] opacity-80">{['H','MIN','SEC'][i]}</div>
              </span>
            ))}
          </div>
          <button onClick={() => s.cat ? navigate('category',{slug:s.cat}) : navigate('search',{query:''})}
            className="bg-white text-blue-700 px-7 py-3 rounded-full font-bold hover:bg-blue-50 transition shadow-lg">
            {s.cta} →
          </button>
        </div>
        <div className="hidden md:block text-[180px] opacity-90">{s.emoji}</div>
      </div>
      <button onClick={() => setSlide((slide-1+3)%3)} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur w-10 h-10 rounded-full text-white hover:bg-white/30 flex items-center justify-center">
        <Icon name="chevL" />
      </button>
      <button onClick={() => setSlide((slide+1)%3)} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur w-10 h-10 rounded-full text-white hover:bg-white/30 flex items-center justify-center">
        <Icon name="chevR" />
      </button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {HERO_SLIDES.map((_,k) => (
          <button key={k} onClick={() => setSlide(k)}
            className={`h-2 rounded-full transition-all ${k===slide?'w-8 bg-white':'w-2 bg-white/50'}`} />
        ))}
      </div>
    </div>
  );
};

const HomePage = () => {
  const { navigate, recentlyViewed, categories: cats } = useApp();
  const [flash, setFlash]       = useState([]);
  const [trending, setTrending] = useState([]);
  const [sellers, setSellers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [flashTime, setFlashTime] = useState({ h:5, m:12, s:30 });

  useEffect(() => {
    const t = setInterval(() => setFlashTime(p => {
      let s=p.s-1,m=p.m,h=p.h;
      if(s<0){s=59;m--;} if(m<0){m=59;h--;} if(h<0){h=23;}
      return {h,m,s};
    }), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      const [fp, tp, sp] = await Promise.all([
        productsApi.list({ sort:'discount', limit:10 }),
        productsApi.list({ sort:'popular', limit:8 }),
        sellersApi.list(),
      ]);
      setFlash(fp.products);
      setTrending(tp.products);
      setSellers(sp);
      setLoading(false);
    };
    load().catch(console.error);
  }, []);

  return (
    <div>
      <HeroBanner />

      {/* Categories */}
      <section className="max-w-[1400px] mx-auto px-4 mt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Acheter par catégorie</h2>
        <div className="grid grid-cols-4 md:grid-cols-6 xl:grid-cols-11 gap-3">
          {cats.slice(0, 11).map(c => (
            <div key={c.slug} onClick={() => navigate('category', { slug: c.slug })}
              className="bg-white rounded-2xl p-4 text-center cursor-pointer border border-gray-200 hover-lift hover:border-blue-400 transition">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-3xl mb-2">{c.icon}</div>
              <div className="text-xs font-semibold text-slate-700">{c.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Flash Deals */}
      <section className="max-w-[1400px] mx-auto px-4 mt-10">
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-t-2xl p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Icon name="zap" size={24} className="fill-current" />
            <h2 className="text-2xl font-extrabold">OFFRES FLASH</h2>
            <span className="bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">Temps limité !</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>Se termine dans:</span>
            <div className="flex gap-1">
              {[flashTime.h, flashTime.m, flashTime.s].map((v,i) => (
                <span key={i} className="bg-slate-900 px-2 py-1 rounded text-xs font-bold min-w-[28px] text-center">
                  {String(v).padStart(2,'0')}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-b-2xl p-4 border border-t-0 border-gray-200">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {loading ? Array(6).fill(0).map((_,i) => <div key={i} className="shrink-0 w-56"><SkeletonCard /></div>)
              : flash.map(p => (
                <div key={p.id} className="shrink-0 w-56">
                  <ProductCard product={p} />
                  <div className="mt-2 bg-orange-50 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-orange-500 h-full" style={{ width: `${40+Math.random()*40}%` }} />
                  </div>
                  <div className="text-[10px] text-orange-600 font-semibold mt-1">🔥 {Math.floor(40+Math.random()*40)}% vendu</div>
                </div>
              ))}
          </div>
        </div>
      </section>

      {/* Promo Banners */}
      <section className="max-w-[1400px] mx-auto px-4 mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { t:'Tech Premium', d:'Apple, Samsung & plus', cat:'electronics', e:'📱', bg:'linear-gradient(135deg,#0A1F44 0%,#2563EB 100%)' },
          { t:'Semaine Mode', d:'Nouvelles collections', cat:'fashion', e:'👗', bg:'linear-gradient(135deg,#2563EB 0%,#60A5FA 100%)' },
          { t:'Relooking Maison', d:'Jusqu\'à -50%', cat:'home', e:'🛋️', bg:'linear-gradient(135deg,#1E3A8A 0%,#3B82F6 100%)' },
          { t:'Sélection Beauté', d:'Marques de luxe', cat:'beauty', e:'💄', bg:'linear-gradient(135deg,#3B82F6 0%,#DBEAFE 100%)' },
        ].map((b,i) => (
          <div key={i} onClick={() => navigate('category', { slug: b.cat })}
            style={{ background: b.bg }}
            className="rounded-2xl p-6 cursor-pointer hover-lift flex items-center justify-between text-white overflow-hidden">
            <div>
              <div className="text-2xl font-extrabold mb-1 text-shadow">{b.t}</div>
              <div className="text-sm opacity-90 mb-3">{b.d}</div>
              <button className="bg-white text-blue-700 px-5 py-2 rounded-full text-sm font-bold hover:bg-blue-50 transition">
                Voir maintenant →
              </button>
            </div>
            <div className="text-7xl opacity-90">{b.e}</div>
          </div>
        ))}
      </section>

      {/* Trending */}
      <section className="max-w-[1400px] mx-auto px-4 mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Icon name="flame" className="text-red-500" />Tendances du moment
          </h2>
          <button onClick={() => navigate('search', { query: '' })}
            className="text-sm font-semibold text-blue-600 hover:underline flex items-center gap-1">
            Voir tout <Icon name="chevR" size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? Array(8).fill(0).map((_,i) => <SkeletonCard key={i} />)
            : trending.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* Top Sellers */}
      <section className="max-w-[1400px] mx-auto px-4 mt-10">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Icon name="award" className="text-blue-600" />Meilleurs Vendeurs
        </h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          {sellers.map(s => (
            <div key={s.id} onClick={() => navigate('seller', { slug: s.slug })}
              className="shrink-0 w-52 bg-white rounded-2xl p-5 border border-gray-200 hover-lift cursor-pointer text-center">
              <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl mb-3 shadow-lg" style={{ background: s.color }}>
                <span className="text-white">{s.logo}</span>
              </div>
              <div className="font-bold text-slate-800 flex items-center justify-center gap-1 text-sm">{s.name}
                {s.verified && <Icon name="check" size={12} className="text-blue-500 bg-blue-100 rounded-full p-0.5" />}
              </div>
              <div className="text-xs text-gray-500 mt-1">{s.productsCount} produits</div>
            </div>
          ))}
        </div>
      </section>

      {/* Reassurance */}
      <section className="max-w-[1400px] mx-auto px-4 mt-10">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { i:'truck',   t:'Livraison Gratuite', d:'Sur commandes > 200 DT', c:'#2563EB' },
            { i:'refresh', t:'Retours faciles',    d:'15 jours remboursé',     c:'#3B82F6' },
            { i:'shield',  t:'Paiement sécurisé',  d:'100% protégé',           c:'#1E3A8A' },
            { i:'award',   t:'Produits authentiques', d:'Authenticité garantie', c:'#60A5FA' },
          ].map(r => (
            <div key={r.t} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: r.c }}>
                <Icon name={r.i} size={20} />
              </div>
              <div>
                <div className="font-bold text-slate-800 text-sm">{r.t}</div>
                <div className="text-xs text-gray-500">{r.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
