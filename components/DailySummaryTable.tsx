import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { DailyLog, Worker, User, TaskGroup, Task } from '../types';
import { getDynamicTaskByIdWithFallback } from '../constants';
import { playHoverSound, playClickSound } from '../utils/audioUtils';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';

interface DailySummaryTableProps {
    logs: DailyLog[];
    workers: Worker[];
    date: string;
    addLog: (log: Omit<DailyLog, 'id'>) => void;
    deleteLog: (logId: string, ownerId?: string) => void;
    isDayFinalized: boolean;
    isCompact: boolean;
    currentUser: User;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
    taskGroups: TaskGroup[];
    taskMap: Map<number, Task & { category: string }>;
}


const DailySummaryTable: React.FC<DailySummaryTableProps> = ({ logs, workers, date, addLog, deleteLog, isDayFinalized, isCompact, currentUser, requestConfirmation, taskGroups, taskMap }) => {
    
    const [draftQuantities, setDraftQuantities] = useState<Record<string, string>>({});
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    const [isResolveModalOpen, setResolveModalOpen] = useState(false);
    const [resolvingLogs, setResolvingLogs] = useState<DailyLog[]>([]);
    const [newTaskId, setNewTaskId] = useState<number | null>(null);

    const taskOptions = useMemo(() => taskGroups.map(group => ({
        label: group.category,
        options: group.tasks.map(task => ({
            label: task.description,
            value: task.id,
            category: group.category
        }))
    })), [taskGroups]);


    const openResolveModal = (logs: DailyLog[]) => {
        if (isDayFinalized || logs.length === 0) return;
        playClickSound();
        setResolvingLogs(logs);
        setNewTaskId(null);
        setResolveModalOpen(true);
    };

    const closeResolveModal = () => {
        setResolveModalOpen(false);
        setResolvingLogs([]);
        setNewTaskId(null);
    };

    const handleResolve = () => {
        if (!newTaskId || resolvingLogs.length === 0) return;

        const totalQuantity = resolvingLogs.reduce((sum, log) => sum + log.quantity, 0);
        const workerId = resolvingLogs[0].workerId;
        const date = resolvingLogs[0].date;
        const observation = resolvingLogs.map(l => l.observation).filter(Boolean).join('; ');

        // Delete old logs
        resolvingLogs.forEach(log => deleteLog(log.id, log.owner));

        // Add new log
        addLog({
            date,
            workerId,
            taskId: newTaskId,
            quantity: totalQuantity,
            observation: `(Corrigé) ${observation}`.trim()
        });

        closeResolveModal();
    };

    const { headerTaskIds, dataMap, columnTotals } = useMemo(() => {
        const uniqueTaskIdsInLogs = [...new Set(logs.map(log => Number(log.taskId)))];
        const sortedTaskIds = uniqueTaskIdsInLogs.sort((a, b) => Number(a) - Number(b));
        
        const dataMap = new Map<number, Map<number, DailyLog[]>>();
        const totals = new Map<number, number>();

        for (const log of logs) {
            const workerId = Number(log.workerId);
            const taskId = Number(log.taskId);
            const quantity = Number(log.quantity);

            if (!dataMap.has(workerId)) {
                dataMap.set(workerId, new Map());
            }
            const workerMap = dataMap.get(workerId)!;

            if(!workerMap.has(taskId)) {
                workerMap.set(taskId, []);
            }
            workerMap.get(taskId)!.push(log);
            
            if (taskMap.has(taskId)) { // Only sum valid tasks for totals
                totals.set(taskId, (totals.get(taskId) || 0) + quantity);
            }
        }
        
        return { headerTaskIds: sortedTaskIds, dataMap, columnTotals: totals };
    }, [logs, taskMap]);

    useEffect(() => {
        const newDrafts: Record<string, string> = {};
        workers.forEach(worker => {
            headerTaskIds.forEach(taskId => {
                const key = `${worker.id}-${taskId}`;
                const logsForCell = dataMap.get(worker.id)?.get(taskId) || [];
                const quantity = logsForCell.reduce((sum, log) => sum + Number(log.quantity), 0);
                newDrafts[key] = quantity > 0 ? quantity.toFixed(2) : '';
            });
        });
        setDraftQuantities(newDrafts);
    }, [dataMap, workers, headerTaskIds]);

    const checkShadows = useCallback(() => {
        const el = scrollContainerRef.current;
        if (el) {
            const isScrollable = el.scrollWidth > el.clientWidth;
            const scrollEndReached = Math.abs(el.scrollWidth - el.clientWidth - el.scrollLeft) < 1;
            setShowLeftShadow(el.scrollLeft > 0);
            setShowRightShadow(isScrollable && !scrollEndReached);
        }
    }, []);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;

        checkShadows();

        el.addEventListener('scroll', checkShadows, { passive: true });
        
        const resizeObserver = new ResizeObserver(checkShadows);
        resizeObserver.observe(el);
        const tableEl = el.querySelector('table');
        if(tableEl) {
            resizeObserver.observe(tableEl);
        }

        window.addEventListener('resize', checkShadows);

        return () => {
            el.removeEventListener('scroll', checkShadows);
            resizeObserver.disconnect();
            window.removeEventListener('resize', checkShadows);
        };
    }, [checkShadows, headerTaskIds, isCompact]);


    const handleDraftChange = (workerId: number, taskId: number, value: string) => {
        const key = `${workerId}-${taskId}`;
        setDraftQuantities(prev => ({ ...prev, [key]: value }));
    };

    const handleUpdate = (workerId: number, taskId: number) => {
        if (isDayFinalized) return;
        
        const key = `${workerId}-${taskId}`;
        const newQuantityStr = draftQuantities[key];
        const newQuantity = newQuantityStr ? parseFloat(newQuantityStr) : 0;

        const existingLogs = dataMap.get(workerId)?.get(taskId) || [];
        const oldQuantity = existingLogs.reduce((sum, log) => sum + Number(log.quantity), 0);

        // Do nothing if value hasn't effectively changed
        if ( (isNaN(newQuantity) || newQuantity === 0) && oldQuantity === 0) return;
        if (newQuantity === oldQuantity) return;

        // Delete old logs for this cell
        existingLogs.forEach(log => deleteLog(log.id, log.owner));

        // Add a new log if quantity is positive
        if (!isNaN(newQuantity) && newQuantity > 0) {
            const observation = existingLogs.length === 1 ? existingLogs[0].observation : '';
            addLog({
                date: date,
                workerId: workerId,
                taskId: taskId,
                quantity: newQuantity,
                observation: observation,
            });
        }
    };
    
    const handleDeleteCell = (workerId: number, taskId: number) => {
        if (isDayFinalized) return;
        const workerName = workers.find(w => w.id === workerId)?.name;
        const taskName = taskMap.get(taskId)?.description;
        
        const existingLogs = dataMap.get(workerId)?.get(taskId) || [];
        if (existingLogs.length === 0) return;

        requestConfirmation(
            'Confirmer la Suppression',
            `Voulez-vous vraiment supprimer l'entrée pour ${workerName} sur la tâche "${taskName}" ?`,
            () => {
                playClickSound();
                existingLogs.forEach(log => deleteLog(log.id, log.owner));
                handleDraftChange(workerId, taskId, ''); // Clear input visually
            }
        );
    }


    if (logs.length === 0) {
        return <p className="text-center py-8 text-slate-500">Aucune opération enregistrée pour cette date. Utilisez le formulaire ci-dessus pour commencer.</p>
    }
    
    const workersToShow = workers.filter(w => {
        if (currentUser.role === 'superadmin') return true;
        return dataMap.has(w.id);
    });

    return (
        <div className="relative">
            <div ref={scrollContainerRef} className="overflow-x-auto border border-slate-200 rounded-lg shadow-inner bg-slate-50/50">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-white uppercase bg-sonacos-slate-dark sticky top-0 z-10">
                        <tr>
                            <th scope="col" className={`border-b-2 border-r border-slate-500 min-w-[160px] sticky left-0 bg-sonacos-slate-dark z-10 font-semibold ${isCompact ? 'px-2 py-1.5' : 'px-4 py-3'}`}>
                                Ouvrier
                            </th>
                            {headerTaskIds.map(taskId => {
                                const task = getDynamicTaskByIdWithFallback(taskId, taskMap);
                                return (
                                    <th key={task.id} scope="col" className={`border-b-2 border-r border-slate-500 text-center font-semibold ${isCompact ? 'min-w-[70px] px-1 py-1.5' : 'min-w-[120px] px-2 py-3'}`}>
                                        {task.category === 'Opérations Diverses' || task.category === 'À METTRE À JOUR' ? (
                                            <div className={`font-bold ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{task.description}</div>
                                        ) : (
                                            <>
                                                <div className={`font-extrabold uppercase tracking-wide ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>{task.category}</div>
                                                <div className={`font-medium text-slate-300 mt-0.5 ${isCompact ? 'text-[8px]' : 'text-[9px]'}`}>{task.description}</div>
                                            </>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {workersToShow.map(worker => {
                            const hasLogs = dataMap.has(worker.id);
                            return (
                                <tr key={worker.id} className={`bg-white border-b border-slate-200 ${!hasLogs ? 'opacity-60' : ''}`}>
                                    <td className={`font-medium text-slate-900 whitespace-nowrap border-r border-slate-200 sticky left-0 bg-white transition-colors duration-150 ${isCompact ? 'px-2 py-1 text-xs' : 'px-4 py-2'}`}>
                                        {worker.name}
                                    </td>
                                    {headerTaskIds.map(taskId => {
                                        const isOutdated = !taskMap.has(taskId);
                                        const key = `${worker.id}-${taskId}`;
                                        const logsForCell = dataMap.get(worker.id)?.get(taskId) || [];
                                        const quantity = logsForCell.reduce((sum, log) => sum + Number(log.quantity), 0);
                                        const hasValue = draftQuantities[key] && parseFloat(draftQuantities[key]) > 0;

                                        if (isOutdated) {
                                            if (quantity > 0) {
                                                return (
                                                    <td key={taskId} className="p-1 text-center border-r border-slate-200 bg-red-100/70">
                                                        <button 
                                                            onClick={() => openResolveModal(logsForCell)}
                                                            disabled={isDayFinalized}
                                                            className="w-full h-full text-xs font-bold text-red-800 hover:bg-red-200 p-2 rounded-sm disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:text-slate-500"
                                                            title="Cette tâche est obsolète et doit être mise à jour."
                                                        >
                                                            {quantity.toFixed(2)} &ndash; RÉPARER
                                                        </button>
                                                    </td>
                                                );
                                            } else {
                                                return <td key={taskId} className="p-0 border-r border-slate-200"></td>;
                                            }
                                        }

                                        return (
                                            <td key={taskId} className="p-0 text-center font-medium border-r border-slate-200 transition-colors duration-150 relative group">
                                                <input 
                                                    type="number"
                                                    value={draftQuantities[key] || ''}
                                                    onChange={(e) => handleDraftChange(worker.id, taskId, e.target.value)}
                                                    onBlur={() => handleUpdate(worker.id, taskId)}
                                                    min="0"
                                                    step="any"
                                                    placeholder="-"
                                                    disabled={isDayFinalized}
                                                    className={`w-full h-full text-center bg-transparent focus:bg-green-50 focus:outline-none focus:ring-1 focus:ring-sonacos-green rounded-sm disabled:cursor-not-allowed disabled:bg-slate-200/50 ${isCompact ? 'p-1 text-xs' : 'p-2'}`}
                                                />
                                                {hasValue && !isDayFinalized && (
                                                    <button 
                                                        onClick={() => handleDeleteCell(worker.id, taskId)}
                                                        className="absolute top-1/2 right-1 -translate-y-1/2 p-0.5 bg-slate-200 text-slate-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 hover:text-red-700"
                                                        title="Supprimer cette entrée"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                                    </button>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-sonacos-slate-dark text-white font-bold">
                            <td className={`border-t-2 border-r border-slate-500 min-w-[160px] sticky left-0 bg-sonacos-slate-dark z-10 ${isCompact ? 'px-2 py-1.5' : 'px-4 py-3'}`}>
                                Total
                            </td>
                            {headerTaskIds.map(taskId => {
                                const total = columnTotals.get(taskId) || 0;
                                return (
                                    <td key={`total-${taskId}`} className={`border-t-2 border-r border-slate-500 text-center ${isCompact ? 'px-1 py-1.5' : 'px-2 py-3'}`}>
                                        {total > 0 ? total.toFixed(2) : '-'}
                                    </td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div aria-hidden="true" className={`absolute top-0 bottom-0 left-0 w-8 bg-gradient-to-r from-slate-200 via-slate-200/70 to-transparent pointer-events-none transition-opacity duration-300 ${showLeftShadow ? 'opacity-100' : 'opacity-0'}`}></div>
            <div aria-hidden="true" className={`absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-slate-200 via-slate-200/70 to-transparent pointer-events-none transition-opacity duration-300 ${showRightShadow ? 'opacity-100' : 'opacity-0'}`}></div>

            <Modal isOpen={isResolveModalOpen} onClose={closeResolveModal} title="Corriger une Tâche Obsolète">
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        L'entrée de <strong>{resolvingLogs.length > 0 ? workers.find(w => w.id === resolvingLogs[0].workerId)?.name : ''}</strong>
                        {' '}avec une quantité totale de <strong>{resolvingLogs.reduce((s, l) => s + l.quantity, 0).toFixed(2)}</strong> est associée à une tâche qui n'existe plus.
                        Veuillez sélectionner la nouvelle tâche correcte dans la liste ci-dessous.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nouvelle Tâche</label>
                        <SearchableSelect options={taskOptions} value={newTaskId} onChange={setNewTaskId} placeholder="Sélectionner une nouvelle tâche" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={closeResolveModal} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="button" onClick={handleResolve} disabled={!newTaskId} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800 disabled:bg-slate-400">Enregistrer la Correction</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DailySummaryTable;