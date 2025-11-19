import React from 'react';
import { playHoverSound } from '../utils/audioUtils';
import { createRipple } from '../utils/effects';
import HistorySidebar from './HistorySidebar';
import { DailyLog, User } from '../types';

type View = 'entry' | 'management' | 'payroll' | 'transferOrder' | 'userManagement' | 'season' | 'finalReport' | 'annualSummary' | 'tariffManagement' | 'detailedPayroll';

interface SidebarProps {
    currentView: View;
    onViewChange: (view: View) => void;
    logs: DailyLog[];
    finalizedDates: string[];
    entryDate: string;
    onHistoryDateSelect: (date: string) => void;
    currentUser: User;
    isVisible: boolean;
    deleteLogsByPeriod: (year: number, month: number, period: 'first' | 'second') => void;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
}

const SonacosLogo = () => (
    <div className="flex items-center justify-center px-4 py-6 border-b border-green-300">
        <h1 className="text-3xl font-montserrat font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-transparent">
            SONACOS
        </h1>
    </div>
);

const NavButton: React.FC<{
    view: View, 
    label: string, 
    icon: React.ReactNode, 
    isActive: boolean, 
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void,
    colorClass: string 
}> = ({ label, icon, isActive, onClick, colorClass }) => {
    const baseClasses = "w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-sonacos-green";
    const activeClasses = "bg-sonacos-green text-white shadow-md";
    return (
        <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : colorClass}`} onMouseEnter={playHoverSound}>
            {icon}
            <span>{label}</span>
        </button>
    );
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, logs, finalizedDates, entryDate, onHistoryDateSelect, currentUser, isVisible, deleteLogsByPeriod, requestConfirmation }) => {
  
  const handleNavClick = (e: React.MouseEvent<HTMLButtonElement>, view: View) => {
    createRipple(e);
    onViewChange(view);
  };
  
  const navColors = [
    "text-green-900 hover:bg-green-300/40",
    "text-green-900 hover:bg-green-300/50",
    "text-green-900 hover:bg-green-300/60",
    "text-green-900 hover:bg-green-300/70",
    "text-green-900 hover:bg-green-300/80",
    "text-green-900 hover:bg-green-300/90",
    "text-green-900 hover:bg-green-400/90",
    "text-green-900 hover:bg-green-400/95",
    "text-green-900 hover:bg-green-400/95",
  ];

  return (
    <aside className={`bg-green-200 border-r border-green-300 flex-shrink-0 flex flex-col print:hidden transition-all duration-300 ease-in-out ${isVisible ? 'w-64' : 'w-0 overflow-hidden'}`}>
        <div className="w-64">
            <SonacosLogo />
            <nav className="p-4 space-y-2">
                <NavButton 
                    view="entry"
                    label="Saisie Journalière"
                    isActive={currentView === 'entry'}
                    onClick={(e) => handleNavClick(e, 'entry')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>}
                    colorClass={navColors[0]}
                />
                 <NavButton 
                    view="finalReport"
                    label="État Bi-mensuel"
                    isActive={currentView === 'finalReport'}
                    onClick={(e) => handleNavClick(e, 'finalReport')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>}
                    colorClass={navColors[1]}
                />
                <NavButton 
                    view="payroll"
                    label="Décompte Paie"
                    isActive={currentView === 'payroll'}
                    onClick={(e) => handleNavClick(e, 'payroll')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm3 1a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>}
                    colorClass={navColors[2]}
                />
                 <NavButton 
                    view="detailedPayroll"
                    label="Paie Détaillée"
                    isActive={currentView === 'detailedPayroll'}
                    onClick={(e) => handleNavClick(e, 'detailedPayroll')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm2-3a1 1 0 011 1v5a1 1 0 11-2 0v-5a1 1 0 011-1zm4-1a1 1 0 10-2 0v7a1 1 0 102 0V8z" clipRule="evenodd" /></svg>}
                    colorClass={navColors[3]}
                />
                <NavButton 
                    view="transferOrder"
                    label="Ordre de Virement"
                    isActive={currentView === 'transferOrder'}
                    onClick={(e) => handleNavClick(e, 'transferOrder')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>}
                    colorClass={navColors[4]}
                />
                <NavButton 
                    view="season"
                    label="Cumul de la Saison"
                    isActive={currentView === 'season'}
                    onClick={(e) => handleNavClick(e, 'season')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zm9 4a1 1 0 10-2 0v6a1 1 0 102 0V7zm-3 2a1 1 0 10-2 0v4a1 1 0 102 0V9zm-3 3a1 1 0 10-2 0v1a1 1 0 102 0v-1z" clipRule="evenodd" /></svg>}
                    colorClass={navColors[5]}
                />
                <NavButton 
                    view="annualSummary"
                    label="Résumé Annuel"
                    isActive={currentView === 'annualSummary'}
                    onClick={(e) => handleNavClick(e, 'annualSummary')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
                    colorClass={navColors[6]}
                />
                 <NavButton 
                    view="management"
                    label="Gestion Ouvriers"
                    isActive={currentView === 'management'}
                    onClick={(e) => handleNavClick(e, 'management')}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zm-1.542 4.032a3.484 3.484 0 00-2.916 0 6.002 6.002 0 00-4.431 5.51V18h12.778v-2.458a6.002 6.002 0 00-4.43-5.51zM16.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM19 14.5a4.5 4.5 0 00-9 0V18h9v-3.5z" /></svg>}
                    colorClass={navColors[7]}
                />
                 {currentUser.role === 'superadmin' && (
                     <>
                        <NavButton 
                            view="tariffManagement"
                            label="Gestion des Tarifs"
                            isActive={currentView === 'tariffManagement'}
                            onClick={(e) => handleNavClick(e, 'tariffManagement')}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5a.997.997 0 01.707.293l7 7zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>}
                            colorClass={navColors[8]}
                        />
                        <NavButton 
                            view="userManagement"
                            label="Gestion Utilisateurs"
                            isActive={currentView === 'userManagement'}
                            onClick={(e) => handleNavClick(e, 'userManagement')}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 11-12 0 6 6 0 0112 0zM7 8a4 4 0 118 0 4 4 0 01-8 0zM4 15a1 1 0 001 1h10a1 1 0 100-2H5a1 1 0 00-1 1z" clipRule="evenodd" /></svg>}
                            colorClass={navColors[8]}
                        />
                    </>
                )}
            </nav>
            <div className="p-4 border-t border-green-300 flex-1 flex flex-col min-h-0">
                <h3 className="text-sm font-bold text-green-900/80 uppercase tracking-wider mb-3">
                    Historique des Saisies
                </h3>
                <HistorySidebar 
                    logs={logs}
                    finalizedDates={finalizedDates}
                    currentDate={entryDate}
                    onDateSelect={onHistoryDateSelect}
                    deleteLogsByPeriod={deleteLogsByPeriod}
                    requestConfirmation={requestConfirmation}
                />
            </div>
        </div>
    </aside>
  );
};

export default Sidebar;