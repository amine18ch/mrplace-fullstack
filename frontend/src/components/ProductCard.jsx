import { useApp } from '../context/AppContext';
import { fmt, Stars, Badge } from './ui';
import Icon from './Icon';

const ProductCard = ({ product, horizontal = false }) => {
  const { navigate, addToCart, wishlist, toggleWishlist } = useApp();
  const isWish = wishlist.includes(product.id);
  const img = product.images?.[0] || '📦';

  if (horizontal) {
    return (
      <div onClick={() => navigate('product', { id: product.id })}
        className="flex bg-white rounded-xl border border-gray-200 hover:shadow-lg hover-lift cursor-pointer transition overflow-hidden">
        <div className="w-44 h-44 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-7xl shrink-0">
          {img}
        </div>
        <div className="flex-1 p-4 flex flex-col">
          <div className="text-xs text-blue-600 font-semibold">{product.brand}</div>
          <div className="text-sm font-medium text-slate-800 line-clamp-2 mt-1">{product.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <Stars rating={product.rating} />
            <span className="text-xs text-gray-500">({product.reviewsCount})</span>
          </div>
          <div className="mt-auto flex items-end justify-between">
            <div>
              <div className="price-text text-xl text-blue-600">{fmt(product.price)}</div>
              {product.discount > 0 && <div className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</div>}
            </div>
            <button onClick={e => { e.stopPropagation(); addToCart(product); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition">
              Ajouter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => navigate('product', { id: product.id })}
      className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-xl hover-lift cursor-pointer transition overflow-hidden flex flex-col">
      <div className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 aspect-square flex items-center justify-center text-7xl">
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            -{product.discount}%
          </span>
        )}
        {product.tags?.includes('bestseller') && (
          <span className="absolute top-2 right-12 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            ⭐ TOP
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }}
          className={`absolute top-2 right-2 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:scale-110 transition ${isWish ? 'text-red-500' : 'text-gray-400'}`}>
          <Icon name="heart" size={18} className={isWish ? 'fill-current' : ''} />
        </button>
        <span className="transition-transform group-hover:scale-110">{img}</span>
        {product.lowStock && (
          <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            Plus que {product.stock} !
          </span>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <div className="text-xs text-blue-600 font-semibold">{product.brand}</div>
        <div className="text-sm font-medium text-slate-800 line-clamp-2 min-h-[40px] mt-1">{product.title}</div>
        <div className="flex items-center gap-1 mt-1">
          <Stars rating={product.rating} />
          <span className="text-xs text-gray-500">({product.reviewsCount})</span>
        </div>
        <div className="mt-2">
          <div className="price-text text-lg text-slate-900">{fmt(product.price)}</div>
          {product.discount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 line-through">{fmt(product.originalPrice)}</span>
              <span className="text-xs text-green-600 font-semibold">Éco. {fmt(product.originalPrice - product.price)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
          <Icon name="truck" size={12} className="text-blue-600" />
          {product.freeDelivery ? 'Livraison gratuite' : 'Livraison standard'}
        </div>
        <button onClick={e => { e.stopPropagation(); addToCart(product); }}
          className="mt-2 w-full py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition opacity-0 group-hover:opacity-100">
          Ajouter au panier
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
