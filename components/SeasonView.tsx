import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { DailyLog, Worker, WorkerGroup, WorkedDays, Task } from '../types';
import { getDynamicTaskByIdWithFallback } from '../constants';
import { useGlow } from '../utils/effects';
import { printElement, exportToExcel, exportToPDF } from '../utils/exportUtils';
import ExportMenu from './ExportMenu';

const getCurrentSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let startYear, endYear;
    if (currentMonth >= 4) { // May or later
        startYear = currentYear;
        endYear = currentYear + 1;
    } else { // Before May
        startYear = currentYear - 1;
        endYear = currentYear;
    }
    const startDate = `${startYear}-05-01`;
    const endDate = `${endYear}-04-30`;
    return { startDate, endDate, startYear, endYear };
};

interface SeasonViewProps {
    allLogs: DailyLog[];
    workerGroups: WorkerGroup[];
    workedDays: WorkedDays[];
    taskMap: Map<number, Task & { category: string }>;
    isPrinting?: boolean;
}

const SeasonView: React.FC<SeasonViewProps> = ({ allLogs, workerGroups, workedDays, taskMap, isPrinting = false }) => {
    const reportCardRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showLeftShadow, setShowLeftShadow] = useState(false);
    const [showRightShadow, setShowRightShadow] = useState(false);
    useGlow(reportCardRef);
    
    const { startDate, endDate, startYear, endYear } = useMemo(() => getCurrentSeason(), []);
    
    const workerOwnerMap = useMemo(() => {
        const map = new Map<number, string>();
        workerGroups.forEach(group => {
            if (group && group.owner && Array.isArray(group.workers)) {
                group.workers.forEach(worker => {
                    if (worker) {
                        map.set(worker.id, group.owner!);
                    }
                });
            }
        });
        return map;
    }, [workerGroups]);

    const { summaryData, headerTaskIds, columnTotals } = useMemo(() => {
        const logsForSeason = allLogs.filter(log => log.date >= startDate && log.date <= endDate);

        const seasonStartUTC = new Date(Date.UTC(startYear, 4, 1)); // May 1st
        const seasonEndUTC = new Date(Date.UTC(endYear, 4, 1));     // May 1st of next year (exclusive)

        const workedDaysForSeason = workedDays.filter(wd => {
            const entryDateUTC = new Date(Date.UTC(wd.year, wd.month - 1, 1));
            return entryDateUTC >= seasonStartUTC && entryDateUTC < seasonEndUTC;
        });

        // Get ALL workers, including those from archived/departed groups, to ensure their seasonal activity is counted.
        const allWorkersFromAllGroups = workerGroups
            .filter(g => g && Array.isArray(g.workers))
            .flatMap(g => g.workers.filter(w => w)); // filter(w => w) for safety

        const data = new Map<number, { worker: Worker; tasks: Map<number, number>; workedDays: number }>();
        
        allWorkersFromAllGroups.forEach(worker => {
            data.set(worker.id, {
                worker,
                tasks: new Map<number, number>(),
                workedDays: 0,
            });
        });

        logsForSeason.forEach(log => {
            const workerOwnerId = workerOwnerMap.get(log.workerId);
            if (data.has(log.workerId) && log.owner === workerOwnerId) {
                const workerData = data.get(log.workerId)!;
                const currentQty = workerData.tasks.get(log.taskId) || 0;
                workerData.tasks.set(log.taskId, currentQty + log.quantity);
            }
        });

        workedDaysForSeason.forEach(wd => {
            const workerOwnerId = workerOwnerMap.get(wd.workerId);
            if (data.has(wd.workerId) && wd.owner === workerOwnerId) {
                const workerData = data.get(wd.workerId)!;
                workerData.workedDays += wd.days;
            }
        });

        // Filter the final list to show only workers who had activity during the season.
        const finalData = Array.from(data.values()).filter(d => d.tasks.size > 0 || d.workedDays > 0);
        finalData.sort((a, b) => a.worker.name.localeCompare(b.worker.name));
        
        const taskIds = new Set<number>();
        finalData.forEach(d => {
            d.tasks.forEach((_, taskId) => taskIds.add(taskId));
        });
        const sortedTaskIds = Array.from(taskIds).sort((a, b) => a - b);
        
        const totals: { workedDays: number; tasks: Map<number, number> } = {
            workedDays: 0,
            tasks: new Map<number, number>(),
        };

        finalData.forEach(d => {
            totals.workedDays += d.workedDays;
            d.tasks.forEach((qty, taskId) => {
                const currentTotal = totals.tasks.get(taskId) || 0;
                totals.tasks.set(taskId, currentTotal + qty);
            });
        });

        return { summaryData: finalData, headerTaskIds: sortedTaskIds, columnTotals: totals };
    }, [allLogs, workerGroups, workedDays, startDate, endDate, startYear, endYear, workerOwnerMap]);

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
        window.addEventListener('resize', checkShadows);
        return () => {
            if (el) {
                el.removeEventListener('scroll', checkShadows);
            }
            resizeObserver.disconnect();
            window.removeEventListener('resize', checkShadows);
        };
    }, [checkShadows, headerTaskIds]);

    const formattedStartDate = new Date(startDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const formattedEndDate = new Date(endDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const ReportContent = () => {
        const tableStyle = { 
            fontSize: '10px', 
            fontFamily: 'Arial, sans-serif',
            borderCollapse: 'collapse' as const, 
            width: '100%',
            tableLayout: 'fixed' as const
        };
        const thStyle = { 
            border: '1px solid #000', 
            padding: '6px', 
            backgroundColor: '#e2e8f0', 
            textAlign: 'center' as const,
            fontFamily: 'Montserrat, sans-serif',
            verticalAlign: 'middle'
        };
        const tdStyle = { border: '1px solid #000', padding: '4px', verticalAlign: 'middle', textAlign: 'center' as const };
        const tdLeftStyle = { ...tdStyle, textAlign: 'left' as const };
        const titleRowStyle = {
            border: 'none',
            textAlign: 'center' as const,
            fontWeight: '800',
            fontSize: '16px',
            fontFamily: 'Montserrat, sans-serif',
            padding: '10px 0',
            textTransform: 'uppercase' as const,
            backgroundColor: 'white'
        };

        return (
        <div id="season-summary-table-container" className="printable-report printable-a4 p-4 bg-white">
            <table style={{...tableStyle, marginBottom: '10px', border: 'none'}}>
                <tbody>
                    <tr>
                        <td style={titleRowStyle}>CUMUL DE LA SAISON</td>
                    </tr>
                     <tr>
                        <td style={{textAlign: 'center', border: 'none', fontSize: '12px', paddingBottom:'10px'}}>Période du {formattedStartDate} au {formattedEndDate}</td>
                    </tr>
                </tbody>
            </table>

            {summaryData.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Aucune donnée enregistrée pour la saison actuelle.</p>
            ) : (
                <div ref={scrollContainerRef} className="overflow-x-auto border border-slate-200 rounded-lg shadow-inner bg-slate-50/50 print:shadow-none print:border-none print:bg-transparent">
                    <table style={tableStyle}>
                        <colgroup>
                            <col style={{ width: '250px' }} />
                            <col style={{ width: '100px' }} />
                             {headerTaskIds.map(id => <col key={id} style={{ width: '100px' }} />)}
                        </colgroup>
                        <thead>
                            <tr>
                                <th style={{...thStyle, fontWeight: 'bold'}}>Ouvrier</th>
                                <th style={{...thStyle, fontWeight: 'bold'}}>Total Jours<br/>Travaillés</th>
                                {headerTaskIds.map(taskId => {
                                    const task = getDynamicTaskByIdWithFallback(taskId, taskMap);
                                    return (
                                        <th key={task.id} style={thStyle}>
                                            {task.category === 'Opérations Diverses' || task.category === 'À METTRE À JOUR' ? (
                                                <span style={{fontSize: '9px', fontWeight: 'bold'}}>{task.description}</span>
                                            ) : (
                                                <>
                                                    <span style={{display:'block', fontSize: '10px', color: '#000', fontWeight: '900', textTransform: 'uppercase', lineHeight: '1.1', marginBottom: '2px'}}>{task.category}</span>
                                                    <span style={{fontSize: '9px', color: '#333', fontWeight: 'normal'}}>{task.description}</span>
                                                </>
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {summaryData.map(({ worker, tasks, workedDays }) => (
                                <tr key={worker.id}>
                                    <td style={{...tdLeftStyle, fontWeight: 'bold'}}>{worker.name}</td>
                                    <td style={{...tdStyle, backgroundColor: '#f8fafc'}}>
                                        {workedDays > 0 ? workedDays : '-'}
                                    </td>
                                    {headerTaskIds.map(taskId => {
                                        const quantity = tasks.get(taskId) || 0;
                                        return (
                                            <td key={taskId} style={tdStyle}>
                                                {quantity > 0 ? quantity.toFixed(2) : '-'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ backgroundColor: '#e2e8f0' }}>
                                <td style={{...tdLeftStyle, fontWeight: 'bold', textTransform: 'uppercase'}}>Total</td>
                                <td style={{...tdStyle, fontWeight: 'bold'}}>
                                    {columnTotals.workedDays > 0 ? columnTotals.workedDays : '-'}
                                </td>
                                {headerTaskIds.map(taskId => {
                                    const total = columnTotals.tasks.get(taskId) || 0;
                                    return (
                                        <td key={`total-${taskId}`} style={{...tdStyle, fontWeight: 'bold'}}>
                                            {total > 0 ? total.toFixed(2) : '-'}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    )};
    
    if (isPrinting) {
        return <ReportContent />;
    }

    return (
        <div className="space-y-8">
            <div ref={reportCardRef} className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 interactive-glow">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <div>
                         <h2 className="text-2xl font-bold text-slate-800">Cumul de la Saison</h2>
                         <p className="text-md text-slate-500 mt-1">
                            Période : <span className="font-semibold">{formattedStartDate}</span> au <span className="font-semibold">{formattedEndDate}</span>
                         </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {summaryData.length > 0 && (
                            <ExportMenu
                                onPrint={() => printElement('season-summary-table-container', `Cumul Saison ${startDate}_${endDate}`)}
                                onExportExcel={() => exportToExcel('season-summary-table-container', `cumul_saison_${startDate}_${endDate}`)}
                                onExportPDF={() => exportToPDF('season-summary-table-container', `cumul_saison_${startDate}_${endDate}`)}
                            />
                        )}
                    </div>
                </div>
                <ReportContent />
            </div>
        </div>
    );
};

export default SeasonView;