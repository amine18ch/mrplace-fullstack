import { DriverProvider, useDriver } from './context/DriverContext';
import DriverLogin from './pages/DriverLogin';
import DriverTour from './pages/DriverTour';

const DriverRouter = () => {
  const { driver, logout } = useDriver();
  if (!driver) return <DriverLogin />;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 h-14 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">🚚</div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">MARKET</div>
            <div className="text-slate-500 text-xs">Chauffeur</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-slate-300 text-xs font-medium">{driver.name}</div>
            <div className="text-slate-500 text-xs">CIN: {driver.cin}</div>
          </div>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-red-400 transition rounded-lg hover:bg-red-500/10">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="pb-6">
        <DriverTour />
      </main>
    </div>
  );
};

export default function DriverApp() {
  return (
    <DriverProvider>
      <DriverRouter />
    </DriverProvider>
  );
}
