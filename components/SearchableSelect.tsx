import React, { useState, useRef, useEffect } from 'react';

interface Option {
    label: string;
    value: number;
    category: string;
}

interface OptionGroup {
    label: string;
    options: Option[];
}

interface SearchableSelectProps {
    options: OptionGroup[];
    value: number | null;
    onChange: (value: number | null) => void;
    placeholder: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const allOptions = options.flatMap(g => g.options);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (selectedValue: number) => {
        onChange(selectedValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const filteredGroups = options.map(group => ({
        ...group,
        options: group.options.filter(option =>
            option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            group.label.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(group => group.options.length > 0);

    const selectedOption = value ? allOptions.find(opt => opt.value === value) : null;

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className="w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-left flex justify-between items-center disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={disabled}
            >
                <span className={`truncate ${selectedOption ? 'text-slate-900' : 'text-slate-500'}`}>{selectedOption?.label || placeholder}</span>
                <svg className={`h-5 w-5 text-slate-400 transform transition-transform ${isOpen ? '-rotate-180' : 'rotate-0'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-80 flex flex-col">
                    <div className="p-2 border-b border-slate-200">
                        <input
                            type="text"
                            placeholder="Rechercher une tâche..."
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-sonacos-green focus:border-sonacos-green"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <ul className="overflow-y-auto">
                         {filteredGroups.map(group => (
                             <li key={group.label}>
                                <span className="px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-800 block sticky top-0 uppercase tracking-wider">{group.label}</span>
                                <ul>
                                    {group.options.map(option => (
                                        <li key={option.value}
                                            className={`px-3 py-2 cursor-pointer transition-colors duration-150 ${value === option.value ? 'bg-sonacos-green text-white' : 'hover:bg-green-50/50'}`}
                                            onClick={() => handleSelect(option.value)}
                                        >
                                            <div className="flex flex-col">
                                                <span className={`text-sm ${value === option.value ? 'text-white' : 'text-slate-800'}`}>{option.label}</span>
                                                <span className={`text-xs ${value === option.value ? 'text-green-200' : 'text-slate-500'}`}>{option.category}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;