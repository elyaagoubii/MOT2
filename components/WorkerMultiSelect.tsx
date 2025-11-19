import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Worker, WorkerGroup } from '../types';

interface WorkerMultiSelectProps {
    workerGroups: WorkerGroup[];
    selectedWorkerIds: number[];
    onChange: (ids: number[]) => void;
    disabled?: boolean;
}

const WorkerMultiSelect: React.FC<WorkerMultiSelectProps> = ({ workerGroups, selectedWorkerIds, onChange, disabled = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    
    const allWorkerIds = useMemo(() => 
        workerGroups
            .filter(g => g && Array.isArray(g.workers))
            .flatMap(g => g.workers.map(w => w.id)), 
    [workerGroups]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (workerId: number) => {
        const newSelection = selectedWorkerIds.includes(workerId)
            ? selectedWorkerIds.filter(id => id !== workerId)
            : [...selectedWorkerIds, workerId];
        onChange(newSelection);
    };

    const handleGroupToggle = (group: { workers: Worker[] }) => {
        const groupWorkerIds = group.workers.map(w => w.id);
        const areAllSelected = groupWorkerIds.length > 0 && groupWorkerIds.every(id => selectedWorkerIds.includes(id));
        
        let newSelection;
        if (areAllSelected) {
            // Deselect all workers in this group
            newSelection = selectedWorkerIds.filter(id => !groupWorkerIds.includes(id));
        } else {
            // Select all workers in this group
            newSelection = [...new Set([...selectedWorkerIds, ...groupWorkerIds])];
        }
        onChange(newSelection);
    };

    const filteredGroups = useMemo(() => {
        if (!Array.isArray(workerGroups)) return [];
        return workerGroups
            .map(group => {
                if (!group || !Array.isArray(group.workers)) {
                    return { ...group, workers: [] };
                }
                return {
                    ...group,
                    workers: group.workers.filter(worker =>
                        worker && worker.name && typeof worker.name === 'string' &&
                        worker.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                };
            })
            .filter(group => group.workers && group.workers.length > 0);
    }, [workerGroups, searchTerm]);

    const selectionText = selectedWorkerIds.length > 0
        ? `${selectedWorkerIds.length} ouvrier(s) sélectionné(s)`
        : 'Sélectionner des ouvriers';
    
    const handleSelectAll = () => onChange(allWorkerIds);
    const handleDeselectAll = () => onChange([]);

    return (
        <div className="relative" ref={wrapperRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className="w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-left flex justify-between items-center disabled:bg-slate-100 disabled:cursor-not-allowed"
                disabled={disabled}
            >
                <span className="truncate">{selectionText}</span>
                <svg className={`h-5 w-5 text-slate-400 transform transition-transform ${isOpen ? '-rotate-180' : 'rotate-0'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-30 w-full mt-1 bg-white border border-slate-300 rounded-md shadow-lg max-h-80 flex flex-col">
                    <div className="p-2 border-b border-slate-200">
                        <input
                            type="text"
                            placeholder="Rechercher un ouvrier..."
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-sonacos-green focus:border-sonacos-green"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="p-2 border-b border-slate-200 flex justify-between">
                         <button onClick={handleSelectAll} className="text-xs text-sonacos-green hover:underline font-semibold">Tout sélectionner</button>
                         <button onClick={handleDeselectAll} className="text-xs text-sonacos-green hover:underline font-semibold">Tout désélectionner</button>
                    </div>
                    <ul className="overflow-y-auto">
                        {filteredGroups.map(group => {
                            const groupWorkerIds = group.workers.map(w => w.id);
                            const selectedInGroupCount = groupWorkerIds.filter(id => selectedWorkerIds.includes(id)).length;
                            const isAllSelected = groupWorkerIds.length > 0 && selectedInGroupCount === groupWorkerIds.length;
                            const isPartiallySelected = selectedInGroupCount > 0 && selectedInGroupCount < groupWorkerIds.length;

                            return (
                             <li key={group.id}>
                                <label className="px-3 py-2 text-xs font-bold text-slate-600 block bg-slate-100 hover:bg-slate-200 cursor-pointer flex items-center w-full sticky top-0">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-slate-300 text-sonacos-green focus:ring-sonacos-green"
                                        checked={isAllSelected}
                                        ref={el => { if (el) el.indeterminate = isPartiallySelected; }}
                                        onChange={() => handleGroupToggle(group)}
                                    />
                                    <span className="ml-2">{group.groupName}</span>
                                </label>
                                <ul>
                                    {group.workers.map(worker => (
                                        <li key={worker.id}
                                            className="pl-8 px-3 py-2 cursor-pointer hover:bg-green-50/50 flex items-center"
                                            onClick={() => handleSelect(worker.id)}
                                        >
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-slate-300 text-sonacos-green focus:ring-sonacos-green pointer-events-none"
                                                checked={selectedWorkerIds.includes(worker.id)}
                                                readOnly
                                            />
                                            <span className="ml-3 text-sm text-slate-700">{worker.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        )})}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default WorkerMultiSelect;