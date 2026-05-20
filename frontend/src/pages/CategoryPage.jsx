import { useState, useEffect, useMemo } from 'react';
import { productsApi, categoriesApi } from '../api/client';
import { useApp } from '../context/AppContext';
import ProductCard from '../components/ProductCard';
import { SkeletonCard } from '../components/ui';
import Icon from '../components/Icon';

const CategoryPage = ({ slug }) => {
  const { navigate } = useApp();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [sort, setSort] = useState('popular');
  const [filters, setFilters] = useState({
    minPrice:'', maxPrice:'', brands:[], minRating:0,
    minDiscount:0, express:false, inStock:false,
  });

  const CAT_NAMES = {
    electronics:'Électronique', fashion:'Mode', home:'Maison & Cuisine',
    beauty:'Beauté', sports:'Sports', toys:'Jouets & Bébé',
    grocery:'Épicerie', auto:'Auto',
  };
  const CAT_ICONS = {
    electronics:'📱', fashion:'👕', home:'🛋️', beauty:'💄',
    sports:'⚽', toys:'🧸', grocery:'🛒', auto:'🚗',
  };

  useEffect(() => {
    if (!slug) return;
    categoriesApi.brands(slug).then(setBrands).catch(() => setBrands([]));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    const params = { category: slug, sort, limit: 40 };
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.brands.length) params.brand = filters.brands.join(',');
    if (filters.minRating) params.minRating = filters.minRating;
    if (filters.minDiscount) params.minDiscount = filters.minDiscount;
    if (filters.express) params.express = 'true';
    if (filters.inStock) params.inStock = 'true';

    productsApi.list(params)
      .then(r => {
        setProducts(r.products || []);
        setTotal(r.total || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error('[CategoryPage] erreur chargement:', err);
        setLoading(false);
      });
  }, [slug, sort,
    filters.minPrice, filters.maxPrice, filters.minRating,
    filters.minDiscount, filters.express, filters.inStock,
    filters.brands.join(','),
  ]);

  const clearAll = () => setFilters({ minPrice:'', maxPrice:'', brands:[], minRating:0, minDiscount:0, express:false, inStock:false });
  const toggleBrand = (b) => setFilters(f => ({ ...f, brands: f.brands.includes(b) ? f.brands.filter(x=>x!==b) : [...f.brands,b] }));
  const activeCount = (filters.brands.length?1:0)+(filters.minRating?1:0)+(filters.minDiscount?1:0)+(filters.express?1:0)+(filters.inStock?1:0)+(filters.minPrice||filters.maxPrice?1:0);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <div className="text-sm text-gray-500 mb-4">
        <span onClick={() => navigate('home')} className="cursor-pointer hover:text-blue-600">Accueil</span>
        <span className="mx-2">/</span>
        <span className="text-slate-700 font-semibold">{CAT_NAMES[slug]}</span>
      </div>
      <h1 className="text-2xl font-extrabold text-slate-800 mb-6 flex items-center gap-2">
        <span className="text-3xl">{CAT_ICONS[slug]}</span>{CAT_NAMES[slug]}
      </h1>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <Icon name="filter" size={18} />Filtres
                {activeCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">{activeCount}</span>}
              </div>
              {activeCount > 0 && <button onClick={clearAll} className="text-xs text-blue-600 hover:underline font-semibold">Tout effacer</button>}
            </div>

            {/* Price */}
            <div className="mb-5">
              <div className="font-semibold text-slate-700 text-sm mb-2">Fourchette de prix (DT)</div>
              <div className="flex gap-2 mb-2">
                <input type="number" value={filters.minPrice} onChange={e => setFilters(f=>({...f,minPrice:e.target.value}))}
                  placeholder="Min" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
                <input type="number" value={filters.maxPrice} onChange={e => setFilters(f=>({...f,maxPrice:e.target.value}))}
                  placeholder="Max" className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400" />
              </div>
            </div>

            {/* Brands */}
            {brands.length > 0 && (
              <div className="mb-5">
                <div className="font-semibold text-slate-700 text-sm mb-2">Marque</div>
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {brands.map(b => (
                    <label key={b.name} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded">
                      <input type="checkbox" checked={filters.brands.includes(b.name)} onChange={() => toggleBrand(b.name)} className="accent-blue-600" />
                      <span className="text-sm text-slate-700 flex-1">{b.name}</span>
                      <span className="text-xs text-gray-400">({b.count})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Rating */}
            <div className="mb-5">
              <div className="font-semibold text-slate-700 text-sm mb-2">Note minimale</div>
              {[4,3,2].map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded">
                  <input type="radio" checked={filters.minRating===r} onChange={() => setFilters(f=>({...f,minRating:f.minRating===r?0:r}))} className="accent-blue-600" />
                  <span className="text-sm">{'⭐'.repeat(r)}</span>
                  <span className="text-xs text-slate-600">et +</span>
                </label>
              ))}
            </div>

            {/* Discount */}
            <div className="mb-5">
              <div className="font-semibold text-slate-700 text-sm mb-2">Remise</div>
              {[10,20,30,50].map(d => (
                <label key={d} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 px-2 py-1 rounded">
                  <input type="radio" checked={filters.minDiscount===d} onChange={() => setFilters(f=>({...f,minDiscount:f.minDiscount===d?0:d}))} className="accent-blue-600" />
                  <span className="text-sm text-slate-700">{d}% ou plus</span>
                </label>
              ))}
            </div>

            {/* Toggles */}
            {[
              { key:'express', label:'Livraison Express' },
              { key:'inStock', label:'En stock uniquement' },
            ].map(t => (
              <label key={t.key} className="flex items-center justify-between cursor-pointer mb-3 hover:bg-blue-50 px-2 py-1.5 rounded">
                <span className="text-sm font-semibold text-slate-700">{t.label}</span>
                <div className={`w-10 h-5 rounded-full ${filters[t.key]?'bg-blue-600':'bg-gray-300'} relative transition`}
                  onClick={() => setFilters(f=>({...f,[t.key]:!f[t.key]}))}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${filters[t.key]?'left-5':'left-0.5'}`} />
                </div>
              </label>
            ))}
          </div>
        </aside>

        {/* Products */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="text-sm text-slate-600"><span className="font-bold text-blue-600">{total}</span> produits trouvés</div>
            <div className="flex items-center gap-3">
              <select value={sort} onChange={e => setSort(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400">
                <option value="popular">Popularité</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="rating">Meilleure note</option>
                <option value="newest">Plus récent</option>
                <option value="discount">Meilleure remise</option>
              </select>
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
                <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view==='grid'?'bg-blue-100 text-blue-600':'text-gray-400'}`}><Icon name="grid" size={16} /></button>
                <button onClick={() => setView('list')} className={`p-1.5 rounded ${view==='list'?'bg-blue-100 text-blue-600':'text-gray-400'}`}><Icon name="list" size={16} /></button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array(8).fill(0).map((_,i) => <SkeletonCard key={i} />)}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-xl font-bold text-slate-800 mb-2">Aucun produit trouvé</div>
              <button onClick={clearAll} className="px-5 py-2 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700">Effacer les filtres</button>
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(p => <ProductCard key={p.id} product={p} horizontal />)}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CategoryPage;
