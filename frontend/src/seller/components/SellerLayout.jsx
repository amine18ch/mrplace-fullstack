import { useSeller } from '../context/SellerContext';

const NAV = [
  { id:'dashboard', label:'Tableau de bord', icon:'M3 12L12 3l9 9M5 10v10h14V10' },
  { id:'products',  label:'Mes produits',    icon:'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12', badge: 'pendingProducts' },
  { id:'orders',    label:'Commandes',       icon:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: 'pendingOrders' },
  { id:'messages',  label:'Messages',        icon:'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', badge: 'unreadMessages' },
  { id:'returns',   label:'Retours',         icon:'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6', badge: 'pendingReturns' },
  { id:'reviews',   label:'Avis clients',    icon:'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { id:'store',     label:'Ma boutique',     icon:'M3 3h13v13H3zM16 8h4l3 3v5h-7zM7 19a2 2 0 11-4 0 2 2 0 014 0zM19 19a2 2 0 11-4 0 2 2 0 014 0z' },
  { id:'finance',   label:'Mes revenus',     icon:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { id:'settings',  label:'Paramètres',      icon:'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
];

const SvgIcon = ({ path, size=18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

export default function SellerLayout({ children }) {
  const { seller, logout, page, navigate, notifications } = useSeller();
  const initials = seller?.name?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() || 'V';

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Logo + Store info */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: seller?.color || '#2563EB' }}>
              {seller?.logo || '🏪'}
            </div>
            <div className="min-w-0">
              <div className="text-white font-bold text-sm truncate">{seller?.name}</div>
              <div className="text-slate-500 text-xs truncate">{seller?.email}</div>
              {seller?.verified && (
                <span className="text-xs text-blue-400 flex items-center gap-1">
                  <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  Vérifié
                </span>
              )}
            </div>
          </div>
          {/* Badge */}
          {seller?.badge && (
            <div className="mt-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {seller.badge}
              </span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => {
            const badge = item.badge ? notifications[item.badge] : 0;
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}>
                <SvgIcon path={item.icon} />
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20' : 'bg-orange-500'} text-white`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Liens utiles */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <a href="/" target="_blank" rel="noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-300 text-xs rounded-lg hover:bg-slate-800 transition-colors">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
            Voir ma boutique
          </a>
          <button onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-500/70 hover:text-red-400 text-xs rounded-lg hover:bg-red-500/10 transition-colors">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4 flex-shrink-0">
          <h1 className="text-slate-200 font-semibold capitalize flex-1">
            {NAV.find(n => n.id === page)?.label || 'Tableau de bord'}
          </h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: seller?.color || '#2563EB' }}>
              {seller?.logo || initials}
            </div>
            <div className="hidden md:block">
              <div className="text-slate-200 text-xs font-medium">{seller?.name}</div>
              <div className="text-slate-500 text-xs">Espace vendeur</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
