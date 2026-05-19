import Icon from './Icon';

export const fmt = (n) =>
  (Math.round(n * 1000) / 1000)
    .toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' DT';

export const Stars = ({ rating, size = 12 }) => (
  <div className="flex items-center gap-0.5">
    {[1,2,3,4,5].map(i => (
      <Icon key={i} name="star" size={size}
        className={i <= Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'} />
    ))}
  </div>
);

export const Badge = ({ children, color = 'blue', className = '' }) => {
  const cls = {
    blue: 'bg-blue-100 text-blue-700', red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-700', orange: 'bg-orange-100 text-orange-700',
    dark: 'bg-slate-800 text-white', primary: 'bg-blue-600 text-white',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls[color]} ${className}`}>
      {children}
    </span>
  );
};

export const Spinner = ({ size = 20 }) => (
  <div style={{ width: size, height: size }}
    className="rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
);

export const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
    <div className="aspect-square bg-gray-200" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-gray-200 rounded w-1/3" />
      <div className="h-4 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-5 bg-gray-200 rounded w-1/2" />
    </div>
  </div>
);
