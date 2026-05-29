import { useApp } from '../context/AppContext';
import { fmt, Stars } from './ui';
import Icon from './Icon';

// Affiche une vraie image ou un emoji selon le contenu
export const ImgOrEmoji = ({ src, alt = '', className = '', emojiClass = '' }) => {
  const isUrl = src && (src.startsWith('/') || src.startsWith('http'));
  if (isUrl) {
    return (
      <img
        src={src} alt={alt}
        className={`object-cover object-center ${className}`}
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex'); }}
      />
    );
  }
  return <span className={`flex items-center justify-center ${emojiClass}`}>{src || '📦'}</span>;
};

const ProductCard = ({ product, horizontal = false }) => {
  const { navigate, addToCart, wishlist, toggleWishlist } = useApp();
  const isWish = wishlist.includes(product.id);
  const imgs = Array.isArray(product.images) ? product.images : [];
  const img  = imgs[0] || '📦';
  const isUrl = img.startsWith('/') || img.startsWith('http');

  if (horizontal) {
    return (
      <div onClick={() => navigate('product', { id: product.id })}
        className="flex bg-white rounded-xl border border-gray-200 hover:shadow-lg cursor-pointer transition overflow-hidden">
        <div className="w-40 h-40 sm:w-44 sm:h-44 bg-gray-50 flex items-center justify-center shrink-0 overflow-hidden">
          {isUrl
            ? <img src={img} alt={product.title} className="w-full h-full object-cover" />
            : <span className="text-6xl">{img}</span>}
        </div>
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <div className="text-xs text-blue-600 font-semibold">{product.brand}</div>
          <div className="text-sm font-medium text-slate-800 line-clamp-2 mt-1">{product.title}</div>
          <div className="flex items-center gap-2 mt-1">
            <Stars rating={product.rating} />
            <span className="text-xs text-gray-500">({product.reviewsCount})</span>
          </div>
          <div className="mt-auto flex items-end justify-between pt-2">
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
      className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-xl cursor-pointer transition overflow-hidden flex flex-col">
      <div className="relative bg-gray-50 aspect-square flex items-center justify-center overflow-hidden">
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
            -{product.discount}%
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); toggleWishlist(product.id); }}
          className={`absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-110 transition ${isWish ? 'text-red-500' : 'text-gray-400'}`}>
          <Icon name="heart" size={16} className={isWish ? 'fill-current' : ''} />
        </button>

        {isUrl
          ? <img src={img} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <span className="text-7xl group-hover:scale-110 transition-transform">{img}</span>
        }

        {product.lowStock && (
          <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            Plus que {product.stock} !
          </span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <div className="text-xs text-blue-600 font-semibold truncate">{product.brand}</div>
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
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
          <Icon name="truck" size={12} className="text-blue-600" />
          {product.freeDelivery ? 'Livraison gratuite' : 'Livraison standard'}
        </div>
        <button onClick={e => { e.stopPropagation(); addToCart(product); }}
          className="mt-2 w-full py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition opacity-0 group-hover:opacity-100 sm:block hidden">
          Ajouter au panier
        </button>
        {/* Toujours visible sur mobile */}
        <button onClick={e => { e.stopPropagation(); addToCart(product); }}
          className="mt-2 w-full py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition sm:hidden">
          + Panier
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
