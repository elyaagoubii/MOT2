import React, { useState, useMemo, useRef } from 'react';
import { DailyLog, WorkerGroup, User, TaskGroup, Task } from '../types';
import { getDynamicTaskByIdWithFallback } from '../constants';
import WorkerMultiSelect from './WorkerMultiSelect';
import SearchableSelect from './SearchableSelect';
import DailySummaryTable from './DailySummaryTable';
import { playHoverSound, playClickSound } from '../utils/audioUtils';
import { createRipple, useGlow } from '../utils/effects';
import { printElement, exportToExcel, exportToPDF } from '../utils/exportUtils';
import ExportMenu from './ExportMenu';

interface DailyEntryViewProps {
    logs: DailyLog[];
    addLog: (log: Omit<DailyLog, 'id'>) => void;
    deleteLog: (logId: string, ownerId?: string) => void;
    finalizedDates: string[];
    onToggleFinalize: (date: string) => void;
    workerGroups: WorkerGroup[];
    entryDate: string;
    setEntryDate: (date: string) => void;
    currentUser: User;
    deleteLogsByDate: (date: string) => void;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
    taskGroups: TaskGroup[];
    taskMap: Map<number, Task & { category: string }>;
}

const DailyEntryView: React.FC<DailyEntryViewProps> = ({ logs, addLog, deleteLog, finalizedDates, onToggleFinalize, workerGroups, entryDate, setEntryDate, currentUser, deleteLogsByDate, requestConfirmation, taskGroups, taskMap }) => {
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number | ''>('');
    const [observation, setObservation] = useState('');
    const [isCompactMode, setIsCompactMode] = useState(false);

    const entryCardRef = useRef<HTMLDivElement>(null);
    const dailyCardRef = useRef<HTMLDivElement>(null);
    const dailySummaryTableContainerRef = useRef<HTMLDivElement>(null); // For exports
    useGlow(entryCardRef);
    useGlow(dailyCardRef);
    
    const taskOptions = useMemo(() => taskGroups.map(group => ({
        label: group.category,
        options: group.tasks.map(task => ({
            label: task.description,
            value: task.id,
            category: group.category
        }))
    })), [taskGroups]);

    const allWorkers = useMemo(() => 
        workerGroups.filter(g => g && Array.isArray(g.workers)).flatMap(g => g.workers)
    , [workerGroups]);

    const activeWorkerGroups = useMemo(() => 
        workerGroups
            .filter(g => g && !g.isArchived && Array.isArray(g.workers))
            .map(g => ({
                ...g,
                workers: g.workers.filter(w => w && !w.isArchived)
            }))
            .filter(g => g.workers.length > 0), 
    [workerGroups]);

    const isDayFinalized = useMemo(() => finalizedDates.includes(entryDate), [finalizedDates, entryDate]);
    
    const handleAddEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (isDayFinalized) return;

        if (!entryDate || selectedWorkerIds.length === 0 || !selectedTaskId || !quantity) {
            alert("Veuillez remplir tous les champs obligatoires.");
            return;
        }

        const numWorkers = selectedWorkerIds.length;
        const quantityPerWorker = Number(quantity) / numWorkers;

        selectedWorkerIds.forEach(workerId => {
            addLog({
                date: entryDate,
                workerId,
                taskId: selectedTaskId,
                quantity: quantityPerWorker,
                observation,
            });
        });

        // Reset form
        setSelectedWorkerIds([]);
        setSelectedTaskId(null);
        setQuantity('');
        setObservation('');
    };
    
    const logsForSelectedDate = useMemo(() => {
        return logs.filter(log => log.date === entryDate);
    }, [logs, entryDate]);

    const handleDateNavigate = (offset: number) => {
        const currentDate = new Date(entryDate);
        currentDate.setUTCDate(currentDate.getUTCDate() + offset);
        setEntryDate(currentDate.toISOString().split('T')[0]);
    };
    
    const handleDeleteDay = () => {
        if (isDayFinalized) return;
        const dateStr = new Date(entryDate + 'T00:00:00').toLocaleDateString('fr-FR');
        requestConfirmation(
            'Confirmer la Suppression',
            `Êtes-vous sûr de vouloir supprimer TOUTES les saisies pour le ${dateStr} ? Cette action est irréversible.`,
            () => {
                playClickSound();
                deleteLogsByDate(entryDate);
            }
        );
    };

    const handleExport = (format: 'print' | 'excel' | 'pdf') => {
        if (!dailySummaryTableContainerRef.current) return;
        
        const tableContainerId = 'daily-summary-table-container';
        const title = `Résumé du ${entryDate}`;
        const fileName = `Resume_Journalier_${entryDate}`;

        // Temporarily assign an ID for export functions to find the element
        const container = dailySummaryTableContainerRef.current;
        container.id = tableContainerId;
        
        switch(format) {
            case 'print':
                printElement(tableContainerId, title, 'landscape');
                break;
            case 'excel':
                exportToExcel(tableContainerId, fileName);
                break;
            case 'pdf':
                exportToPDF(tableContainerId, fileName, 'landscape');
                break;
        }

        // Clean up the ID after export
        container.id = '';
    }

    return (
        <div className="space-y-8">
            <div ref={entryCardRef} className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 interactive-glow" onMouseEnter={playHoverSound}>
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleDateNavigate(-1)} className="p-2 rounded-full hover:bg-slate-100" title="Jour précédent"><svg className="h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green font-semibold"/>
                        <button onClick={() => handleDateNavigate(1)} className="p-2 rounded-full hover:bg-slate-100" title="Jour suivant"><svg className="h-5 w-5 text-slate-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg></button>
                    </div>
                    { currentUser.role === 'superadmin' &&
                        <button onClick={() => onToggleFinalize(entryDate)} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${isDayFinalized ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>
                            {isDayFinalized ? <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg> : <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 13a3 3 0 100-6 3 3 0 000 6z" /></svg>}
                            <span>{isDayFinalized ? 'Journée Finalisée' : 'Finaliser la Journée'}</span>
                        </button>
                    }
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Nouvelle Saisie</h2>
                <form onSubmit={handleAddEntry} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Ouvrier(s)</label>
                            <WorkerMultiSelect workerGroups={activeWorkerGroups} selectedWorkerIds={selectedWorkerIds} onChange={setSelectedWorkerIds} disabled={isDayFinalized} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tâche Effectuée</label>
                            <SearchableSelect options={taskOptions} value={selectedTaskId} onChange={setSelectedTaskId} placeholder="Sélectionner une tâche" disabled={isDayFinalized} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1.5">Quantité Totale</label>
                            <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="any" required className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" disabled={isDayFinalized} />
                        </div>
                        <div>
                            <label htmlFor="observation" className="block text-sm font-medium text-slate-700 mb-1.5">Observation (Optionnel)</label>
                            <input type="text" id="observation" value={observation} onChange={(e) => setObservation(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" disabled={isDayFinalized} />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" onClick={createRipple} disabled={isDayFinalized} className="flex items-center gap-2 px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sonacos-green disabled:bg-slate-400 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            <span>Ajouter Saisie</span>
                        </button>
                    </div>
                </form>
            </div>

            <div ref={dailyCardRef} className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 interactive-glow" onMouseEnter={playHoverSound}>
                <div ref={dailySummaryTableContainerRef}>
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Résumé du {new Date(entryDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                            {logsForSelectedDate.length > 0 && <p className="text-sm text-slate-500">{logsForSelectedDate.length} saisie(s) au total.</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                <input type="checkbox" checked={isCompactMode} onChange={() => setIsCompactMode(prev => !prev)} className="h-4 w-4 rounded border-slate-300 text-sonacos-green focus:ring-sonacos-green" />
                                <span>Vue Compacte</span>
                            </label>
                            {logsForSelectedDate.length > 0 &&
                                <ExportMenu 
                                    onPrint={() => handleExport('print')}
                                    onExportExcel={() => handleExport('excel')}
                                    onExportPDF={() => handleExport('pdf')}
                                />
                            }
                            {!isDayFinalized && logsForSelectedDate.length > 0 && (
                                <button onClick={handleDeleteDay} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 bg-red-100 text-red-700 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    <span>Supprimer Journée</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <DailySummaryTable 
                        logs={logsForSelectedDate}
                        workers={allWorkers}
                        date={entryDate}
                        addLog={addLog}
                        deleteLog={deleteLog}
                        isDayFinalized={isDayFinalized}
                        isCompact={isCompactMode}
                        currentUser={currentUser}
                        requestConfirmation={requestConfirmation}
                        taskGroups={taskGroups}
                        taskMap={taskMap}
                    />
                </div>
            </div>
        </div>
    );
};

export default DailyEntryView;