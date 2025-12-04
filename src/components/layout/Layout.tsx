import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <Sidebar />

      {/* Header mobile */}
      <Header />

      {/* Contenu principal */}
      <main className="lg:pl-64 pt-16 lg:pt-0 pb-20 lg:pb-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Navigation mobile */}
      <BottomNav />
    </div>
  );
}
