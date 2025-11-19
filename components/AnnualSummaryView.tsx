import React, { useState, useMemo, useRef } from 'react';
import { DailyLog, Worker, WorkerGroup, WorkedDays, Task, AnnualSummaryData, SavedAnnualSummary, User, SavedFinalReport } from '../types';
import { playHoverSound } from '../utils/audioUtils';
import { createRipple, useGlow } from '../utils/effects';
import { printElement, exportToExcel, exportToPDF } from '../utils/exportUtils';
import ExportMenu from './ExportMenu';

interface AnnualSummaryViewProps {
    allLogs: DailyLog[]; // still needed for calculations within source reports
    workerGroups: WorkerGroup[];
    workedDays: WorkedDays[];
    taskMap: Map<number, Task & { category: string }>;
    isPrinting?: boolean;
    savedReports: SavedAnnualSummary[];
    onSave: (report: Partial<SavedAnnualSummary>) => void;
    onDelete: (report: SavedAnnualSummary) => void;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
    currentUser: User;
    savedFinalReports: SavedFinalReport[];
    onDirectExport: (report: SavedAnnualSummary, format: 'print' | 'pdf' | 'excel') => void;
    viewingReport?: SavedAnnualSummary | null;
}

const LAIT_TASK_ID = 37;
const PANIER_TASK_ID = 47;
const HNS_GROUP_NAME = 'GROUPE HYAT NEGOCE SERVICES';

const AnnualSummaryView: React.FC<AnnualSummaryViewProps> = ({ allLogs, workerGroups, workedDays, taskMap, isPrinting = false, savedReports, onSave, onDelete, requestConfirmation, currentUser, savedFinalReports, onDirectExport, viewingReport: viewingReportForExport }) => {
    const optionsCardRef = useRef<HTMLDivElement>(null);
    useGlow(optionsCardRef);
    
    const [mode, setMode] = useState<'list' | 'form'>('list');
    const [editingReport, setEditingReport] = useState<SavedAnnualSummary | null>(null);
    const [viewingReport, setViewingReport] = useState<SavedAnnualSummary | null>(null);
    const [draftData, setDraftData] = useState<AnnualSummaryData[] | null>(null);

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);

    const allWorkers = useMemo(() => workerGroups.flatMap(g => g.workers), [workerGroups]);

    const resetForm = () => {
        setSelectedYear(new Date().getFullYear());
        setSelectedReportIds([]);
        setDraftData(null);
        setEditingReport(null);
        setViewingReport(null);
    };

    const handleNewReport = () => {
        resetForm();
        setMode('form');
    };

    const handleEditReport = (report: SavedAnnualSummary) => {
        setMode('form');
        setEditingReport(report);
        setViewingReport(null);
        setDraftData(null);
        setSelectedYear(report.params.year);
        setSelectedReportIds(report.params.sourceReportIds);
    };

    const handleDeleteReport = (report: SavedAnnualSummary) => {
        requestConfirmation("Confirmer la Suppression", `Êtes-vous sûr de vouloir supprimer ce résumé annuel pour ${report.params.year}?`, () => {
            onDelete(report);
            setViewingReport(null);
        });
    };
    
    const handleGenerateDraft = () => {
        if (selectedReportIds.length === 0) {
            alert("Veuillez sélectionner au moins un rapport bi-mensuel pour générer le résumé.");
            return;
        }

        const sourceReports = savedFinalReports.filter(r => selectedReportIds.includes(r.id));
        const aggregatedLogs = sourceReports.flatMap(r => r.data.logs);
        const aggregatedWorkedDays = sourceReports.flatMap(r => r.data.allWorkedDays);
        const workerIdsWithActivity = new Set(sourceReports.flatMap(r => r.data.workers.map(w => w.id)));
        
        const hnsGroup = workerGroups.find(g => g.groupName === HNS_GROUP_NAME);
        const hnsWorkerIds = new Set(hnsGroup?.workers.map(w => w.id) || []);

        const processedData: AnnualSummaryData[] = Array.from(workerIdsWithActivity).map(workerId => {
            const worker = allWorkers.find(w => w.id === workerId);
            if (!worker) return null;

            const workerLogs = aggregatedLogs.filter(l => l.workerId === workerId);
            const joursTravailles = aggregatedWorkedDays.filter(wd => wd.workerId === workerId).reduce((sum, wd) => sum + wd.days, 0);

            const totalOperation = workerLogs.filter(log => log.taskId !== LAIT_TASK_ID && log.taskId !== PANIER_TASK_ID)
                .reduce((sum, log) => sum + (Number(log.quantity) * (taskMap.get(log.taskId)?.price || 0)), 0);

            const anciennete = totalOperation * (worker.seniorityPercentage / 100);
            const totalBrut = totalOperation + anciennete;
            const retenu = totalBrut * 0.0674;
            const indemnites = joursTravailles * ((taskMap.get(LAIT_TASK_ID)?.price || 0) + (taskMap.get(PANIER_TASK_ID)?.price || 0));
            const netPay = totalBrut - retenu + indemnites;
            
            const group = workerGroups.find(g => g.workers.some(w => w.id === workerId));
            const isHNS = hnsWorkerIds.has(workerId);

            return { worker, totalOperation, anciennete, totalBrut, retenu, joursTravailles, indemnites, netPay, groupName: group?.groupName || 'N/A', isHNS };
        }).filter((item): item is AnnualSummaryData => item !== null && item.netPay > 0);
        
        setDraftData(processedData.sort((a, b) => a.worker.name.localeCompare(b.worker.name)));
    };


    const handleSaveReport = () => {
        if (!draftData) return;
        const report: Partial<SavedAnnualSummary> = {
            id: editingReport?.id, owner: editingReport?.owner, createdAt: editingReport?.createdAt,
            params: { year: selectedYear, sourceReportIds: selectedReportIds },
            data: draftData,
        };
        onSave(report);
        resetForm();
        setMode('list');
    };
    
    const ReportContent: React.FC<{ data: AnnualSummaryData[], params: SavedAnnualSummary['params'], id: string }> = ({ data, params, id }) => {
        const hnsData = data.filter(d => d.isHNS);
        const otherData = data.filter(d => !d.isHNS);
        
        const hnsTotal = hnsData.reduce((sum, item) => sum + item.netPay, 0);
        const otherTotal = otherData.reduce((sum, item) => sum + item.netPay, 0);
        const grandTotal = hnsTotal + otherTotal;
        
        const tableStyle = { 
            fontSize: '11px', 
            fontFamily: 'Arial, sans-serif',
            borderCollapse: 'collapse' as const, 
            width: '100%',
            tableLayout: 'fixed' as const
        };
        const thStyle = { 
            border: '1px solid #000', 
            padding: '6px', 
            backgroundColor: '#e2e8f0', 
            fontWeight: 'bold',
            textAlign: 'center' as const,
            fontFamily: 'Montserrat, sans-serif'
        };
        const tdStyle = { border: '1px solid #000', padding: '4px', verticalAlign: 'middle' };
        const tdLeftStyle = { ...tdStyle, textAlign: 'left' as const };
        const tdRightStyle = { ...tdStyle, textAlign: 'right' as const };
        const titleRowStyle = {
            border: 'none',
            textAlign: 'center' as const,
            fontWeight: '800',
            fontSize: '18px',
            fontFamily: 'Montserrat, sans-serif',
            padding: '10px 0',
            textTransform: 'uppercase' as const,
            backgroundColor: 'white'
        };

        return (
            <div id={id} className="printable-report bg-white p-6 printable-a4">
                 <table style={{...tableStyle, marginBottom: '20px', border: 'none'}}>
                     <tbody>
                        <tr>
                            <td style={titleRowStyle}>RÉSUMÉ ANNUEL DES RÉMUNÉRATIONS</td>
                        </tr>
                        <tr>
                             <td style={{textAlign: 'center', border: 'none', fontSize: '14px'}}>Exercice {params.year}</td>
                        </tr>
                    </tbody>
                </table>

                 <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                    <div className="p-4 border border-blue-300 bg-blue-50 rounded-lg"><p className="text-xs font-bold text-blue-800 uppercase">Total Autres Groupes</p><p className="text-lg font-bold text-blue-900 mt-1">{otherTotal.toFixed(2)} DH</p></div>
                    <div className="p-4 border border-green-300 bg-green-50 rounded-lg"><p className="text-xs font-bold text-green-800 uppercase">Total {HNS_GROUP_NAME}</p><p className="text-lg font-bold text-green-900 mt-1">{hnsTotal.toFixed(2)} DH</p></div>
                    <div className="p-4 border border-slate-300 bg-slate-100 rounded-lg"><p className="text-xs font-bold text-slate-800 uppercase">Total Général</p><p className="text-lg font-bold text-slate-900 mt-1">{grandTotal.toFixed(2)} DH</p></div>
                </div>

                <table style={tableStyle}>
                     <colgroup>
                        <col style={{ width: '300px' }} />
                        <col style={{ width: '250px' }} />
                        <col />
                        <col />
                        <col />
                        <col />
                    </colgroup>
                    <thead>
                        <tr>
                            <th style={thStyle}>Ouvrier</th>
                            <th style={thStyle}>Groupe</th>
                            <th style={thStyle}>Total Brut (DH)</th>
                            <th style={thStyle}>Retenue (DH)</th>
                            <th style={thStyle}>Indemnités (DH)</th>
                            <th style={thStyle}>Net à Payer (DH)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.worker.id} style={item.isHNS ? {backgroundColor: '#f0fdf4'} : {}}>
                                <td style={tdLeftStyle}><strong>{item.worker.name}</strong></td>
                                <td style={tdLeftStyle}>{item.groupName}</td>
                                <td style={tdRightStyle}>{item.totalBrut.toFixed(2)}</td>
                                <td style={{...tdRightStyle, color: '#dc2626'}}>({item.retenu.toFixed(2)})</td>
                                <td style={{...tdRightStyle, color: '#16a34a'}}>{item.indemnites.toFixed(2)}</td>
                                <td style={{...tdRightStyle, fontWeight: 'bold'}}>{item.netPay.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={{ backgroundColor: '#e2e8f0' }}>
                            <td colSpan={5} style={{...tdRightStyle, fontWeight: 'bold', textTransform: 'uppercase'}}>Total Général</td>
                            <td style={{...tdRightStyle, fontWeight: 'bold', fontSize: '12px'}}>{grandTotal.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div style={{ marginTop: '40px', pageBreakInside: 'avoid' }}>
                    <p style={{ textAlign: 'right', fontSize: '12px', fontFamily: 'Arial' }}>Fait à Taza le {new Date().toLocaleDateString('fr-FR')}</p>
                </div>
            </div>
        );
    }
    
    if (isPrinting) {
        const reportToPrint = viewingReport || viewingReportForExport;
        if (reportToPrint) {
            return <ReportContent data={reportToPrint.data} params={reportToPrint.params} id="annual-summary-content" />;
        }
        return null;
    }

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
    const availableReportsForYear = savedFinalReports.filter(r => r.params.year === selectedYear)
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return (
        <div className="space-y-8">
            {mode === 'list' && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                     <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-slate-800">Résumés Annuels Sauvegardés</h2><button onClick={handleNewReport} className="flex items-center gap-2 px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg><span>Générer un nouveau résumé</span></button></div>
                     {savedReports.length > 0 ? (
                        <ul className="space-y-3">{savedReports
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map(report => (<li key={report.id} className="p-4 border rounded-lg hover:bg-slate-50 flex justify-between items-center flex-wrap gap-2"><div><button onClick={() => setViewingReport(report)} className="font-semibold text-sonacos-green hover:underline">Résumé pour l'année {report.params.year}</button><p className="text-sm text-slate-500">Créé le: {new Date(report.createdAt).toLocaleString('fr-FR')}{currentUser.role === 'superadmin' && ` par ${report.owner}`}</p></div><div className="flex items-center gap-2"><ExportMenu onPrint={() => onDirectExport(report, 'print')} onExportPDF={() => onDirectExport(report, 'pdf')} onExportExcel={() => onDirectExport(report, 'excel')} /><button onClick={() => handleEditReport(report)} className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button><button onClick={() => handleDeleteReport(report)} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button></div></li>))}</ul>
                    ) : <p className="text-center py-8 text-slate-500">Aucun résumé sauvegardé.</p>}
                </div>
            )}

            {mode === 'form' && (
                <div ref={optionsCardRef} className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 interactive-glow" onMouseEnter={playHoverSound}>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">{editingReport ? 'Modifier le' : 'Nouveau'} Résumé Annuel</h2>
                    <div className="space-y-4">
                        <div><label htmlFor="select-year" className="block text-sm font-medium text-slate-700 mb-1.5">Année Civile</label><select id="select-year" value={selectedYear} onChange={e => {setSelectedYear(Number(e.target.value)); setSelectedReportIds([]);}} className="w-full md:w-1/3 p-2 border border-slate-300 rounded-md shadow-sm">{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                        <div>
                            <h3 className="text-md font-semibold text-slate-700 mb-2">Sélectionner les rapports bi-mensuels à inclure :</h3>
                            {availableReportsForYear.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto border rounded-lg p-2 space-y-2 bg-slate-50">
                                    {availableReportsForYear.map(report => (
                                        <label key={report.id} className="flex items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer"><input type="checkbox" checked={selectedReportIds.includes(report.id)} onChange={() => setSelectedReportIds(prev => prev.includes(report.id) ? prev.filter(id => id !== report.id) : [...prev, report.id])} className="h-4 w-4 rounded border-slate-300 text-sonacos-green focus:ring-sonacos-green" /><span className="ml-3 text-sm text-slate-800">Rapport du {report.data.startDate} au {report.data.endDate}</span></label>
                                    ))}
                                </div>
                            ) : (<p className="text-sm text-slate-500 text-center py-4">Aucun rapport bi-mensuel trouvé pour l'année {selectedYear}.</p>)}
                        </div>
                    </div>
                    <div className="flex justify-between mt-6">
                        <button onClick={() => { setMode('list'); resetForm(); }} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button onClick={(e) => { createRipple(e); handleGenerateDraft(); }} className="flex items-center justify-center gap-2 px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">Générer le Brouillon</button>
                    </div>
                </div>
            )}
            
            {(viewingReport || draftData) && (
                <div className="bg-slate-200 p-8 rounded-lg">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{viewingReport ? 'Aperçu du Résumé Sauvegardé' : 'Brouillon du Résumé'}</h2>
                    <div>
                        {viewingReport && <ExportMenu onPrint={() => onDirectExport(viewingReport, 'print')} onExportPDF={() => onDirectExport(viewingReport, 'pdf')} onExportExcel={() => onDirectExport(viewingReport, 'excel')} />}
                        {draftData && !viewingReport && <button onClick={handleSaveReport} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">Confirmer et Sauvegarder</button>}
                    </div></div>
                    <div className="bg-white shadow-2xl mx-auto max-w-6xl">
                      {viewingReport ? <ReportContent data={viewingReport.data} params={viewingReport.params} id="annual-summary-content" /> : draftData ? <ReportContent data={draftData} params={{year: selectedYear, sourceReportIds: selectedReportIds}} id="annual-summary-content" /> : null}
                    </div>
                    {viewingReport && <div className="flex justify-center mt-4 gap-4"><button onClick={() => setViewingReport(null)} className="px-4 py-2 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600">Fermer l'aperçu</button></div>}
                </div>
            )}
        </div>
    );
};

export default AnnualSummaryView;