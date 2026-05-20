import { useAdmin } from '../context/AdminContext';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Tableau de bord', icon: 'M3 12L12 3l9 9M5 10v10h14V10' },
  { id: 'vendors',   label: 'Vendeurs',         icon: 'M3 3h13v13H3zM16 8h4l3 3v5h-7zM7 19a2 2 0 11-4 0 2 2 0 014 0zM19 19a2 2 0 11-4 0 2 2 0 014 0z', badge: 'pendingVendors' },
  { id: 'products',  label: 'Produits',          icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12', badge: 'pendingProducts' },
  { id: 'orders',    label: 'Commandes',         icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: 'openDisputes' },
  { id: 'customers', label: 'Clients',           icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'finance',   label: 'Finance',           icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-4H9l3-7 3 7h-2v4z' },
  { id: 'marketing', label: 'Marketing',         icon: 'M20 12L12 20l-9-9V3h8l9 9zM7 7h.01' },
  { id: 'settings',  label: 'Paramètres',        icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
  { id: 'logs',      label: "Logs d'audit",      icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
];

const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-400',
  MODERATEUR:  'bg-blue-500/20 text-blue-400',
  COMPTABLE:   'bg-green-500/20 text-green-400',
  SUPPORT:     'bg-slate-500/20 text-slate-400',
};

const SvgIcon = ({ path, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

export default function AdminLayout({ children }) {
  const { admin, logout, currentAdminPage, navigateAdmin, notifications } = useAdmin();

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
            <div>
              <div className="text-white font-bold text-base leading-tight">MARKET</div>
              <div className="text-slate-500 text-xs">Administration</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const badgeCount = item.badge ? notifications[item.badge] : 0;
            const active = currentAdminPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateAdmin(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <SvgIcon path={item.icon} size={18} />
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {badgeCount > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-xs font-medium truncate">{admin?.name}</div>
              <div className="text-slate-500 text-xs truncate">{admin?.email}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-slate-200 font-semibold text-base capitalize">
              {NAV_ITEMS.find(n => n.id === currentAdminPage)?.label || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[admin?.role] || ROLE_COLORS.SUPPORT}`}>
              {admin?.role}
            </span>
            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Déconnexion
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
