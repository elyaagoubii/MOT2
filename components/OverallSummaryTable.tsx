import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { DailyLog, Worker, Task } from '../types';
import { getDynamicTaskByIdWithFallback } from '../constants';
import { playHoverSound } from '../utils/audioUtils';

interface OverallSummaryTableProps {
    allLogs: DailyLog[];
    workers: Worker[];
    isCompact: boolean;
    taskMap: Map<number, Task & { category: string }>;
}

const OverallSummaryTable: React.FC<OverallSummaryTableProps> = ({ allLogs, workers, isCompact, taskMap }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);

    const { headerTaskIds, dataMap, columnTotals } = useMemo(() => {
        if (!allLogs || allLogs.length === 0) {
            return { headerTaskIds: [], dataMap: new Map(), columnTotals: new Map() };
        }

        const uniqueTaskIds = [...new Set(allLogs.map(log => Number(log.taskId)))];
        
        const dataMap = new Map<number, Map<number, number>>();
        const totals = new Map<number, number>();

        for (const log of allLogs) {
            const workerId = Number(log.workerId);
            const taskId = Number(log.taskId);
            const quantity = Number(log.quantity);

            if (!dataMap.has(workerId)) {
                dataMap.set(workerId, new Map());
            }
            const workerMap = dataMap.get(workerId)!;

            const currentQuantity = workerMap.get(taskId) || 0;
            workerMap.set(taskId, currentQuantity + quantity);

            totals.set(taskId, (totals.get(taskId) || 0) + quantity);
        }
        
        return { 
            headerTaskIds: uniqueTaskIds.sort((a, b) => Number(a) - Number(b)), 
            dataMap,
            columnTotals: totals 
        };
    }, [allLogs]);
    

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

    if (allLogs.length === 0) {
        return <p className="text-center py-8 text-slate-500">Aucune donnée à résumer.</p>;
    }

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
                                                <div className={`font-bold ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{task.category}</div>
                                                <div className={`font-normal text-slate-300 mt-0.5 ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>{task.description}</div>
                                            </>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {workers.map(worker => {
                            const workerData = dataMap.get(worker.id);
                            const hasLogs = !!workerData;

                            return (
                                <tr key={worker.id} className={`bg-white border-b border-slate-200 ${!hasLogs ? 'opacity-60' : ''}`}>
                                    <td className={`font-medium text-slate-900 whitespace-nowrap border-r border-slate-200 sticky left-0 bg-white transition-colors duration-150 ${isCompact ? 'px-2 py-1 text-xs' : 'px-4 py-2'}`}>
                                        {worker.name}
                                    </td>
                                    {headerTaskIds.map(taskId => {
                                        const quantity = workerData?.get(taskId) || 0;
                                        return (
                                            <td key={taskId} className={`text-center font-medium border-r border-slate-200 transition-colors duration-150 ${isCompact ? 'p-1 text-xs' : 'p-2'}`}>
                                                {quantity > 0 ? quantity.toFixed(2) : <span className="text-slate-400">-</span>}
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
        </div>
    );
};

export default OverallSummaryTable;