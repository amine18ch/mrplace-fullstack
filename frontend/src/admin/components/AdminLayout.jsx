import { useState } from 'react';
import { useAdmin } from '../context/AdminContext';

const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Tableau de bord',  icon: 'M3 12L12 3l9 9M5 10v10h14V10', roles: ['*'] },
  { id: 'vendors',    label: 'Vendeurs',          icon: 'M3 3h13v13H3zM16 8h4l3 3v5h-7zM7 19a2 2 0 11-4 0 2 2 0 014 0zM19 19a2 2 0 11-4 0 2 2 0 014 0z', roles: ['SUPER_ADMIN', 'MODERATEUR', 'COMPTABLE'], badge: 'pendingVendors' },
  { id: 'products',   label: 'Produits',          icon: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12', roles: ['SUPER_ADMIN', 'MODERATEUR', 'MARKETING'], badge: 'pendingProducts' },
  { id: 'orders',     label: 'Commandes',         icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', roles: ['SUPER_ADMIN', 'MODERATEUR', 'SUPPORT', 'COMPTABLE'], badge: 'openDisputes' },
  { id: 'customers',  label: 'Clients',           icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75', roles: ['SUPER_ADMIN', 'MODERATEUR', 'SUPPORT'] },
  { id: 'finance',    label: 'Finance',           icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', roles: ['SUPER_ADMIN', 'COMPTABLE'] },
  { id: 'categories', label: 'Catégories',         icon: 'M4 6h16M4 12h16M4 18h16', roles: ['SUPER_ADMIN', 'MODERATEUR'] },
  { id: 'banners',     label: 'Banners & Slider',  icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', roles: ['SUPER_ADMIN', 'MODERATEUR', 'MARKETING'] },
  { id: 'flash-sales', label: 'Offres Flash',       icon: 'M13 10V3L4 14h7v7l9-11h-7z', roles: ['SUPER_ADMIN', 'MODERATEUR', 'MARKETING'] },
  { id: 'marketing',  label: 'Marketing',          icon: 'M20 12L12 20l-9-9V3h8l9 9zM7 7h.01', roles: ['SUPER_ADMIN', 'MARKETING'] },
  { id: 'settings',   label: 'Paramètres',        icon: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z', roles: ['SUPER_ADMIN'] },
  { id: 'logs',       label: "Logs d'audit",      icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8', roles: ['SUPER_ADMIN', 'MODERATEUR'] },
];

const ROLE_COLORS = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-400',
  MODERATEUR:  'bg-orange-500/20 text-orange-400',
  COMPTABLE:   'bg-green-500/20 text-green-400',
  SUPPORT:     'bg-blue-500/20 text-blue-400',
  MARKETING:   'bg-violet-500/20 text-violet-400',
};
const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin', MODERATEUR: 'Modérateur',
  COMPTABLE: 'Comptable', SUPPORT: 'Support', MARKETING: 'Marketing',
};

const SvgIcon = ({ path, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={path} />
  </svg>
);

const SidebarContent = ({ admin, visibleNavItems, currentAdminPage, navigateAdmin, notifications, logout, onClose }) => {
  const initials = admin?.name ? admin.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'A';
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">M</div>
            <div>
              <div className="text-white font-bold text-base leading-tight">MARKET</div>
              <div className="text-slate-500 text-xs">Administration</div>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-slate-500 hover:text-white p-1 md:hidden">
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map(item => {
          const badgeCount = item.badge ? notifications[item.badge] : 0;
          const active = currentAdminPage === item.id || currentAdminPage === `${item.id}-detail`;
          return (
            <button key={item.id} onClick={() => { navigateAdmin(item.id); onClose?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}>
              <SvgIcon path={item.icon} />
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

      {/* Admin info */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-slate-200 text-xs font-medium truncate">{admin?.name}</div>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[admin?.role] || ROLE_COLORS.SUPPORT}`}>
              {ROLE_LABELS[admin?.role] || admin?.role}
            </span>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-red-500/70 hover:text-red-400 text-xs rounded-lg hover:bg-red-500/10 transition-colors">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          Déconnexion
        </button>
      </div>
    </div>
  );
};

export default function AdminLayout({ children }) {
  const { admin, logout, currentAdminPage, navigateAdmin, notifications } = useAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.roles.includes('*')) return true;
    if (!admin) return false;
    if (admin.role === 'SUPER_ADMIN') return true;
    return item.roles.includes(admin.role);
  });

  const currentLabel = NAV_ITEMS.find(n => n.id === currentAdminPage || currentAdminPage === `${n.id}-detail`)?.label || 'Dashboard';

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col flex-shrink-0">
        <SidebarContent admin={admin} visibleNavItems={visibleNavItems} currentAdminPage={currentAdminPage}
          navigateAdmin={navigateAdmin} notifications={notifications} logout={logout} />
      </aside>

      {/* Sidebar mobile — drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 flex flex-col shadow-2xl">
            <SidebarContent admin={admin} visibleNavItems={visibleNavItems} currentAdminPage={currentAdminPage}
              navigateAdmin={navigateAdmin} notifications={notifications} logout={logout} onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <h1 className="text-slate-200 font-semibold text-sm md:text-base flex-1 truncate capitalize">{currentLabel}</h1>
          <div className="flex items-center gap-2">
            <span className={`hidden sm:inline-flex text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[admin?.role] || ROLE_COLORS.SUPPORT}`}>
              {ROLE_LABELS[admin?.role] || admin?.role}
            </span>
            <button onClick={logout} className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 text-xs transition-colors px-2 py-1.5 rounded-lg hover:bg-red-500/10">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
