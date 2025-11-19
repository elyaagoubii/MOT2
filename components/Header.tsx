import React from 'react';

type View = 'entry' | 'report' | 'management';

interface HeaderProps {
    currentView: View;
    onViewChange: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onViewChange }) => {
  const NavButton: React.FC<{view: View, label: string}> = ({view, label}) => {
    const isActive = currentView === view;
    const baseClasses = "px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500";
    const activeClasses = "bg-white text-teal-700 shadow";
    const inactiveClasses = "text-slate-500 hover:text-teal-600";
    return (
        <button onClick={() => onViewChange(view)} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {label}
        </button>
    );
  }

  return (
    <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-20 print:hidden border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <h1 className="text-xl font-bold text-slate-800">
                    Gestion des Tâches – SONACOS
                </h1>
            </div>
            <nav className="flex items-center space-x-2 p-1 bg-slate-100 rounded-full">
                <NavButton view="entry" label="Saisie Journalière" />
                <NavButton view="report" label="Générer un Rapport" />
                <NavButton view="management" label="Gestion" />
            </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;