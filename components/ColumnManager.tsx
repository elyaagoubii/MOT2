import React, { useState, useRef, useEffect } from 'react';

interface Column {
    id: number;
    label: string;
    category: string;
}

interface ColumnManagerProps {
    allColumns: Column[];
    visibleColumns: number[];
    onVisibilityChange: (visibleIds: number[]) => void;
}

const ColumnManager: React.FC<ColumnManagerProps> = ({ allColumns, visibleColumns, onVisibilityChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleToggle = (columnId: number) => {
        const newVisible = visibleColumns.includes(columnId)
            ? visibleColumns.filter(id => id !== columnId)
            : [...visibleColumns, columnId];
        onVisibilityChange(newVisible);
    };

    const handleSelectAll = () => {
        onVisibilityChange(allColumns.map(c => c.id));
    };

    const handleDeselectAll = () => {
        onVisibilityChange([]);
    };

    const filteredColumns = allColumns.filter(col => 
        col.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="relative inline-block text-left" ref={wrapperRef}>
            <div>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-slate-100 text-slate-600 hover:bg-slate-200 focus:ring-slate-500"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 5h2v10H5V5zm4 0h2v10H9V5zm4 0h2v10h-2V5z" />
                    </svg>
                    <span>Afficher/Masquer Colonnes</span>
                </button>
            </div>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-30 max-h-96 flex flex-col">
                    <div className="p-2 border-b border-slate-200">
                        <input
                            type="text"
                            placeholder="Rechercher une colonne..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-sonacos-green focus:border-sonacos-green"
                        />
                    </div>
                     <div className="p-2 border-b border-slate-200 flex justify-between">
                        <button onClick={handleSelectAll} className="text-xs text-sonacos-green hover:underline font-semibold">Tout sélectionner</button>
                        <button onClick={handleDeselectAll} className="text-xs text-sonacos-green hover:underline font-semibold">Tout désélectionner</button>
                    </div>
                    <ul className="overflow-y-auto py-1">
                        {filteredColumns.map(col => (
                            <li key={col.id}>
                                <label className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.includes(col.id)}
                                        onChange={() => handleToggle(col.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-sonacos-green focus:ring-sonacos-green"
                                    />
                                    <span className="ml-3">{col.label}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ColumnManager;