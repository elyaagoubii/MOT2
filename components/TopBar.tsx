import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { createRipple } from '../utils/effects';

interface TopBarProps {
    title: string;
    user: User;
    onLogout: () => void;
    onToggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ title, user, onLogout, onToggleSidebar }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

    return (
        <header className="bg-gradient-to-l from-red-600 to-green-400 sticky top-0 z-20 print:hidden">
            <div className="flex items-center justify-between p-4 h-16">
                <div className="flex items-center gap-4">
                    <button
                        onClick={(e) => { createRipple(e); onToggleSidebar(); }}
                        className="text-white p-2 rounded-full hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Afficher/masquer le menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-bold text-white">{title}</h1>
                </div>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(prev => !prev)} className="flex items-center gap-3 cursor-pointer rounded-full p-1 pr-3 transition-colors hover:bg-white/20">
                        <div className="h-9 w-9 rounded-full bg-green-200 flex items-center justify-center text-sonacos-green font-bold text-lg ring-2 ring-green-200">
                           {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-left leading-tight">
                            <span className="text-sm font-medium text-white block">{user.email}</span>
                            {user.role === 'superadmin' && (
                                <span className="text-xs text-green-200 font-semibold block">Admin Général</span>
                            )}
                        </div>
                        <svg className={`h-4 w-4 text-white transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                             <a href="#" onClick={(e) => { e.preventDefault(); createRipple(e as any); onLogout(); }} className="flex items-center gap-3 w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" /></svg>
                                <span>Se déconnecter</span>
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;