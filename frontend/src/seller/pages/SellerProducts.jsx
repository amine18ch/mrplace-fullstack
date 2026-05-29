import { useEffect, useState, useCallback, useRef } from 'react';
import { sellerApi, uploadProductImage } from '../api/sellerClient';
import { useSeller } from '../context/SellerContext';

const EMOJIS = ['📱','💻','👗','🏠','💄','⚽','🧸','🛒','🚗','📺','🎧','⌚','👟','👔','🧥','👜','🧹','🍳','🛞','📷','📚','🎮','🌿','💎','🍵','☕'];
const inputCls = "w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-600";

const STATUS_LABEL = { PUBLISHED:'Publié', PENDING:'Modération', DRAFT:'Brouillon', OUT_OF_STOCK:'Rupture' };
const STATUS_C     = { PUBLISHED:'bg-green-500/20 text-green-400', PENDING:'bg-yellow-500/20 text-yellow-400', DRAFT:'bg-slate-500/20 text-slate-400', OUT_OF_STOCK:'bg-red-500/20 text-red-400' };

const Modal = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
    <div className={`bg-slate-800 rounded-xl border border-slate-700 shadow-2xl ${wide?'w-full max-w-2xl':'w-full max-w-md'} max-h-[90vh] overflow-y-auto`}
      onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-800">
        <h3 className="text-white font-semibold">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white w-8 h-8 flex items-center justify-center rounded hover:bg-slate-700 text-xl">×</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const Field = ({ label, children, required }) => (
  <div>
    <label className="text-slate-400 text-xs font-medium mb-1.5 block">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
    {children}
  </div>
);

// ── ProductForm au niveau module pour éviter la recréation à chaque re-render
const ProductForm = ({ form, setForm, categories, subcategories, discount, fileInputRef, uploading, handleImageUpload, removeImage, actionLoading, modal, handleCreate, handleEdit, setModal }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <Field label="Titre du produit" required>
        <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className={inputCls} placeholder="Ex: iPhone 15 Pro 256Go" />
      </Field>
      <Field label="Marque / Brand">
        <input value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} className={inputCls} placeholder="Apple, Samsung..." />
      </Field>

      <Field label="Catégorie" required>
        <select value={form.categoryId} onChange={e=>setForm(f=>({...f, categoryId:e.target.value, subcategoryId:''}))} className={inputCls}>
          <option value="">Choisir une catégorie...</option>
          {categories.filter(c=>!c.parentId).map(c =>
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          )}
        </select>
      </Field>

      <Field label="Sous-catégorie">
        <select value={form.subcategoryId} onChange={e=>setForm(f=>({...f,subcategoryId:e.target.value}))} className={inputCls} disabled={!subcategories.length}>
          <option value="">— Toute la catégorie —</option>
          {subcategories.map(s =>
            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
          )}
        </select>
      </Field>

      <Field label="Prix de vente (DT)" required>
        <input type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} min="0" step="0.001" className={inputCls} placeholder="299.000" />
      </Field>
      <Field label="Prix original (DT)">
        <div className="relative">
          <input type="number" value={form.originalPrice} onChange={e=>setForm(f=>({...f,originalPrice:e.target.value}))} min="0" step="0.001" className={inputCls} placeholder="399.000" />
          {discount > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">-{discount}%</span>}
        </div>
      </Field>

      <Field label="Stock disponible">
        <input type="number" value={form.stock} onChange={e=>setForm(f=>({...f,stock:e.target.value}))} min="0" className={inputCls} placeholder="100" />
      </Field>
      <Field label="Référence / SKU">
        <input value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))} className={inputCls} placeholder="EX: TH-IP15-256-BLK" />
      </Field>

      <Field label="Garantie">
        <input value={form.warranty} onChange={e=>setForm(f=>({...f,warranty:e.target.value}))} className={inputCls} placeholder="1 an" />
      </Field>
      <Field label="Politique de retour">
        <input value={form.returnPolicy} onChange={e=>setForm(f=>({...f,returnPolicy:e.target.value}))} className={inputCls} placeholder="Retour 15 jours" />
      </Field>
    </div>

    <Field label="Description">
      <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
        rows={3} className={`${inputCls} resize-none`} placeholder="Décrivez votre produit en détail..." />
    </Field>

    <Field label="Tags (séparés par virgule)">
      <input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} className={inputCls} placeholder="bestseller, new, trending" />
    </Field>

    {/* Upload photos */}
    <div>
      <label className="text-slate-400 text-xs font-medium mb-1.5 block">
        Photos du produit <span className="text-slate-600">(max 4 · JPEG, PNG ou WebP · 2 Mo max · 800×800 px min)</span>
      </label>
      <div className="grid grid-cols-4 gap-2 mb-2">
        {form.images.map((img, idx) => {
          const isUrl = img.startsWith('/') || img.startsWith('http');
          return (
            <div key={idx} className="relative aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-700 group">
              {isUrl
                ? <img src={img} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-4xl">{img}</div>}
              <button type="button" onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition font-bold">×</button>
              {idx === 0 && <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Principal</span>}
            </div>
          );
        })}
        {form.images.length < 4 && (
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="aspect-square bg-slate-900 rounded-xl border-2 border-dashed border-slate-600 hover:border-blue-500 flex flex-col items-center justify-center gap-1 transition disabled:opacity-50">
            {uploading
              ? <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              : <><svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-slate-500"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg><span className="text-slate-600 text-[10px]">Ajouter</span></>}
          </button>
        )}
        {Array(Math.max(0, 3 - form.images.length)).fill(0).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-slate-900/50 rounded-xl border border-slate-800/50" />
        ))}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
        onChange={e => handleImageUpload(e.target.files)} />
      <p className="text-slate-600 text-xs">La première photo sera l'image principale.</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {[
        { key:'expressDelivery', label:'Livraison express' },
        { key:'freeDelivery',    label:'Livraison gratuite' },
      ].map(({ key, label }) => (
        <label key={key} className="flex items-center gap-3 bg-slate-900 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-800 transition-colors border border-slate-700">
          <div className={`w-9 h-5 rounded-full ${form[key]?'bg-blue-600':'bg-slate-700'} relative transition-colors flex-shrink-0`}
            onClick={() => setForm(f=>({...f,[key]:!f[key]}))}>
            <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{left: form[key]?'19px':'2px'}} />
          </div>
          <span className="text-slate-300 text-sm">{label}</span>
        </label>
      ))}
    </div>

    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400">
      ℹ️ Votre produit sera soumis à la modération avant publication. Délai habituel : 24h.
    </div>

    <div className="flex gap-3 pt-2">
      <button type="button" onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm transition-colors">
        Annuler
      </button>
      <button type="button" onClick={modal==='create' ? handleCreate : handleEdit}
        disabled={actionLoading || !form.title || !form.price || !form.categoryId}
        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
        {actionLoading ? '...' : modal==='create' ? 'Soumettre le produit' : 'Mettre à jour'}
      </button>
    </div>
  </div>
);

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActLoad] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const emptyForm = { title:'', brand:'', categoryId:'', subcategoryId:'', sku:'', price:'', originalPrice:'', description:'', stock:'100', warranty:'1 an', returnPolicy:'Retour 15 jours', expressDelivery:true, freeDelivery:true, images:[], tags:'' };
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams({ page, limit: 15 });
    if (search) p.append('search', search);
    if (statusFilter !== '') p.append('status', statusFilter);
    sellerApi.get(`/products?${p}`)
      .then(d => { setProducts(d.products || []); setTotal(d.total || 0); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  // Charger les sous-catégories quand la catégorie change
  useEffect(() => {
    if (!form.categoryId) { setSubcategories([]); return; }
    const parent = categories.find(c => c.id === parseInt(form.categoryId));
    setSubcategories(parent?.children || []);
    // Réinitialiser la sous-catégorie si elle n'appartient plus au bon parent
    if (form.subcategoryId) {
      const still = (parent?.children || []).find(s => s.id === parseInt(form.subcategoryId));
      if (!still) setForm(f => ({ ...f, subcategoryId: '' }));
    }
  }, [form.categoryId, categories]);

  const flash = (msg, isErr=false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const act = async (fn, msg) => {
    setActLoad(true); setError('');
    try { await fn(); flash(msg); }
    catch (e) { flash(e.message, true); }
    finally { setActLoad(false); }
  };

  const openCreate = () => {
    setForm(emptyForm); setEditId(null); setModal('create');
  };
  const openEdit = (p) => {
    setEditId(p.id);
    const allCats = categories.flatMap(c => [c, ...(c.children||[])]);
    const cat = allCats.find(c => c.id === p.categoryId);
    const parentId = cat?.parentId ? String(cat.parentId) : String(p.categoryId);
    const subId    = cat?.parentId ? String(p.categoryId) : '';
    setForm({
      title: p.title, brand: p.brand || '',
      categoryId: parentId, subcategoryId: subId,
      sku: p.sku || '', price: String(p.price),
      originalPrice: String(p.originalPrice || p.price),
      description: p.description || '', stock: String(p.stock),
      warranty: p.warranty, returnPolicy: p.returnPolicy,
      expressDelivery: p.expressDelivery, freeDelivery: p.freeDelivery,
      images: p.images || [], tags: (p.tags||[]).join(', '),
    });
    setModal('edit');
  };

  const handleImageUpload = async (files) => {
    if (!files?.length) return;
    const remaining = 4 - form.images.length;
    if (remaining <= 0) return flash('Maximum 4 images par produit', true);
    setUploading(true);
    const toUpload = Array.from(files).slice(0, remaining);
    try {
      const uploaded = await Promise.all(toUpload.map(f => uploadProductImage(f)));
      setForm(f => ({ ...f, images: [...f.images, ...uploaded.map(u => u.url)] }));
    } catch (e) { flash(e.message, true); }
    setUploading(false);
  };

  const removeImage = (idx) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  };

  const buildPayload = () => {
    const finalCategoryId = form.subcategoryId
      ? parseInt(form.subcategoryId)
      : parseInt(form.categoryId);
    return {
      title: form.title, brand: form.brand,
      categoryId: finalCategoryId,
      sku: form.sku || undefined,
      price: parseFloat(form.price),
      originalPrice: parseFloat(form.originalPrice || form.price),
      description: form.description, stock: parseInt(form.stock),
      warranty: form.warranty, returnPolicy: form.returnPolicy,
      expressDelivery: form.expressDelivery, freeDelivery: form.freeDelivery,
      images: form.images.length ? form.images : ['📦'],
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
  };

  const handleCreate = () => act(async () => {
    await sellerApi.post('/products', buildPayload());
    setModal(null); load();
  }, 'Produit soumis pour modération ✓');

  const handleEdit = () => act(async () => {
    await sellerApi.put(`/products/${editId}`, buildPayload());
    setModal(null); load();
  }, 'Produit mis à jour ✓');

  const handleDelete = (id) => act(async () => {
    await sellerApi.delete(`/products/${id}`);
    setDeleteConfirm(null); load();
  }, 'Produit retiré ✓');

  const discount = form.originalPrice && parseFloat(form.originalPrice) > parseFloat(form.price||0)
    ? Math.round((1 - parseFloat(form.price)/parseFloat(form.originalPrice))*100) : 0;

  return (
    <div className="p-6 max-w-6xl">
      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">{error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">{success}</div>}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-white">Mes produits</h2>
          <p className="text-slate-500 text-sm mt-0.5">{total} produit(s) au total</p>
        </div>
        <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2">
          + Ajouter un produit
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher un produit..."
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 w-64" />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none">
          <option value="">Tous</option>
          <option value="active">Actifs</option>
          <option value="inactive">En modération</option>
        </select>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_,i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
              <div className="h-24 bg-slate-800 rounded-lg mb-3" />
              <div className="h-3 bg-slate-800 rounded mb-2 w-3/4" />
              <div className="h-3 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-16 text-center">
          <div className="text-6xl mb-4">📦</div>
          <div className="text-slate-400 font-medium mb-1">Aucun produit</div>
          <div className="text-slate-600 text-sm mb-5">Commencez par ajouter votre premier produit</div>
          <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
            + Ajouter un produit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
              {/* Image */}
              <div className="bg-slate-800 h-32 flex items-center justify-center relative overflow-hidden">
                {(() => { const img = p.images?.[0]; return img && (img.startsWith('/') || img.startsWith('http'))
                  ? <img src={img} alt={p.title} className="w-full h-full object-cover" />
                  : <span className="text-6xl">{img || '📦'}</span>; })()
                }
                <span className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full ${STATUS_C[p.status] || STATUS_C['PENDING']}`}>
                  {STATUS_LABEL[p.status] || 'Modération'}
                </span>
                {p.discount > 0 && (
                  <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                    -{p.discount}%
                  </span>
                )}
              </div>
              {/* Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-blue-400 font-medium">{p.brand}</span>
                  {p.category && <span className="text-xs text-slate-600">{p.category.icon} {p.category.name}</span>}
                </div>
                <div className="text-slate-200 text-sm font-medium line-clamp-2 mb-1 min-h-[36px]">{p.title}</div>
                {p.sku && <div className="text-xs text-slate-600 mb-1 font-mono">SKU: {p.sku}</div>}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white font-bold">{new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(p.price)} DT</div>
                    {p.discount > 0 && <div className="text-slate-600 text-xs line-through">{new Intl.NumberFormat('fr-TN',{minimumFractionDigits:3}).format(p.originalPrice)} DT</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-xs">Stock</div>
                    <div className={`text-sm font-medium ${p.stock < 10 ? 'text-orange-400' : 'text-slate-200'}`}>{p.stock}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-2 rounded-lg transition-colors font-medium">
                    ✏️ Modifier
                  </button>
                  <button onClick={() => setDeleteConfirm(p.id)}
                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors border border-red-500/20">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 15 && (
        <div className="flex justify-center gap-2 mt-5">
          <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">← Préc.</button>
          <span className="px-4 py-2 text-slate-400 text-sm">Page {page} / {Math.ceil(total/15)}</span>
          <button onClick={() => setPage(p=>p+1)} disabled={products.length<15} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm disabled:opacity-40">Suiv. →</button>
        </div>
      )}

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal title={modal === 'create' ? 'Ajouter un produit' : 'Modifier le produit'} onClose={() => setModal(null)} wide>
          <ProductForm
            form={form} setForm={setForm}
            categories={categories} subcategories={subcategories}
            discount={discount} fileInputRef={fileInputRef}
            uploading={uploading} handleImageUpload={handleImageUpload} removeImage={removeImage}
            actionLoading={actionLoading} modal={modal}
            handleCreate={handleCreate} handleEdit={handleEdit}
            setModal={setModal}
          />
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Confirmer la suppression" onClose={() => setDeleteConfirm(null)}>
          <p className="text-slate-400 text-sm mb-5">Ce produit sera désactivé. Les commandes existantes ne seront pas affectées.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2.5 rounded-lg text-sm">Annuler</button>
            <button onClick={() => handleDelete(deleteConfirm)} disabled={actionLoading}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium">
              {actionLoading ? '...' : 'Confirmer'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
