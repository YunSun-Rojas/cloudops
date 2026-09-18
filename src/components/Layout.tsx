import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-base dark:bg-night-bg">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-[264px]">
        <Header onOpenMenu={() => setMenuOpen(true)} />

        <main key={location.pathname} className="animate-fade-up px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>

        <footer className="border-t border-line px-4 py-5 text-[12px] text-muted dark:border-night-line dark:text-night-muted sm:px-6 lg:px-8">
          CloudOps Dashboard · Practica integrativa Cloud Foundations · Semanas 5 y 6 · Datos simulados con fines academicos
        </footer>
      </div>
    </div>
  );
}
