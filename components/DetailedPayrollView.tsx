import React, { useState, useMemo, useRef } from 'react';
import { DailyLog, Worker, WorkerGroup, WorkedDays, Task, SavedDetailedPayroll, User, DetailedPayrollData } from '../types';
import WorkerMultiSelect from './WorkerMultiSelect';
import { playHoverSound } from '../utils/audioUtils';
import { createRipple, useGlow } from '../utils/effects';
import { printElement, exportToPDF, exportToExcel } from '../utils/exportUtils';
import ExportMenu from './ExportMenu';
import { convertAmountToWords } from '../utils/numberToWords';
import Modal from './Modal';

interface DetailedPayrollViewProps {
    allLogs: DailyLog[];
    workerGroups: WorkerGroup[];
    workedDays: WorkedDays[];
    onSaveWorkedDays: (data: Omit<WorkedDays, 'id' | 'owner'>) => void;
    taskMap: Map<number, Task & { category: string }>;
    isPrinting?: boolean;
    savedReports: SavedDetailedPayroll[];
    onSave: (report: Partial<SavedDetailedPayroll>) => void;
    onDelete: (report: SavedDetailedPayroll) => void;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
    currentUser: User;
    onDirectExport: (report: SavedDetailedPayroll, format: 'print' | 'pdf' | 'excel') => void;
    viewingReport?: SavedDetailedPayroll | null;
}

const LAIT_TASK_ID = 37;
const PANIER_TASK_ID = 47;
const RET_CNSS_RATE = 0.0448;
const RET_AMO_RATE = 0.0226;

const AdjustmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    workers: Worker[];
    adjustments: SavedDetailedPayroll['params']['additionalInputs'];
    onAdjustmentsChange: (adjustments: SavedDetailedPayroll['params']['additionalInputs']) => void;
    onSave: () => void;
}> = ({ isOpen, onClose, workers, adjustments, onAdjustmentsChange, onSave }) => {
    
    const handleFieldChange = (workerId: number, field: 'avanceAid' | 'ir', value: string) => {
        const updatedAdjustments = { ...adjustments };
        if (!updatedAdjustments[workerId]) {
            updatedAdjustments[workerId] = { avanceAid: '', ir: '' };
        }
        updatedAdjustments[workerId][field] = value;
        onAdjustmentsChange(updatedAdjustments);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ajustements pour la Paie Détaillée">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Modifiez les avances ou l'impôt pour chaque ouvrier. Les totaux seront recalculés après la sauvegarde.
                </p>
                <div className="max-h-80 overflow-y-auto space-y-3 p-2 border rounded-md bg-slate-50">
                    {workers.sort((a,b) => a.name.localeCompare(b.name)).map(worker => (
                        <div key={worker.id} className="p-3 border rounded-md bg-white grid grid-cols-2 gap-4 items-end">
                             <p className="font-semibold col-span-2">{worker.name}</p>
                             <div>
                                <label className="text-xs font-medium text-slate-600">Avance Aïd al-Adha</label>
                                <input
                                    type="number"
                                    value={adjustments[worker.id]?.avanceAid || ''}
                                    onChange={e => handleFieldChange(worker.id, 'avanceAid', e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded-md"
                                    placeholder="0.00"
                                />
                             </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600">Impôt sur le Revenu (IR)</label>
                                <input
                                    type="number"
                                    value={adjustments[worker.id]?.ir || ''}
                                    onChange={e => handleFieldChange(worker.id, 'ir', e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded-md"
                                    placeholder="0.00"
                                />
                             </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                    <button type="button" onClick={onSave} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">Sauvegarder les Ajustements</button>
                </div>
            </div>
        </Modal>
    );
};

const ReportContent: React.FC<{ report: SavedDetailedPayroll; id: string; }> = ({ report, id }) => {
    const { data, params } = report;
    const grandTotal = data.reduce((sum, item) => sum + item.netAPayer, 0);
    const totalInWords = convertAmountToWords(grandTotal);

    const formattedStartDate = new Date(Date.UTC(params.year, params.month - 1, params.period === 'first' ? 1 : 16)).toLocaleDateString('fr-FR');
    const formattedEndDate = new Date(Date.UTC(params.year, params.month - 1, params.period === 'first' ? 15 : new Date(params.year, params.month, 0).getDate())).toLocaleDateString('fr-FR');
    
    // Excel-like styles
    const tableStyle = { 
        fontSize: '8px', 
        fontFamily: 'Arial, sans-serif',
        borderCollapse: 'collapse' as const, 
        width: '100%',
        tableLayout: 'fixed' as const
    };

    const thStyle = { 
        border: '1px solid #000', 
        padding: '4px 1px', 
        verticalAlign: 'middle', 
        textAlign: 'center' as const, 
        backgroundColor: '#e2e8f0', 
        fontWeight: 'bold',
        fontSize: '8px',
        fontFamily: 'Montserrat, sans-serif',
        whiteSpace: 'normal' as const
    };

    const tdStyle = { 
        border: '1px solid #000', 
        padding: '2px 2px', 
        verticalAlign: 'middle', 
        textAlign: 'right' as const,
        whiteSpace: 'nowrap' as const,
        height: '18px'
    };
    const tdCenterStyle = { ...tdStyle, textAlign: 'center' as const };
    const tdLeftStyle = { ...tdStyle, textAlign: 'left' as const, whiteSpace: 'normal' as const };
    
    const titleRowStyle = {
        border: 'none',
        textAlign: 'center' as const,
        fontWeight: '800',
        fontSize: '14px',
        fontFamily: 'Montserrat, sans-serif',
        padding: '5px 0',
        textTransform: 'uppercase' as const,
        backgroundColor: 'white'
    };

    return (
        <div id={id} className="printable-report printable-a4 p-4 bg-white">
            <table style={tableStyle}>
                <colgroup>
                    <col style={{ width: '75px' }} /> {/* CNSS */}
                    <col style={{ width: '65px' }} /> {/* CIN */}
                    <col style={{ width: '220px' }} /> {/* NOM */}
                    <col style={{ width: '40px' }} /> {/* NBR JOURS */}
                    <col style={{ width: '65px' }} /> {/* MONTANT */}
                    <col style={{ width: '50px' }} /> {/* CONGE */}
                    <col style={{ width: '50px' }} /> {/* FERIE */}
                    <col style={{ width: '65px' }} /> {/* ANC */}
                    <col style={{ width: '65px' }} /> {/* TOTAL */}
                    <col style={{ width: '50px' }} /> {/* LAIT */}
                    <col style={{ width: '50px' }} /> {/* PANIER */}
                    <col style={{ width: '50px' }} /> {/* RET CNSS */}
                    <col style={{ width: '50px' }} /> {/* RET AMO */}
                    <col style={{ width: '50px' }} /> {/* AVANCE */}
                    <col style={{ width: '40px' }} /> {/* IR */}
                    <col style={{ width: '75px' }} /> {/* NET */}
                </colgroup>
                <thead>
                     <tr>
                        <th colSpan={16} style={titleRowStyle}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems: 'flex-start'}}>
                                <div style={{textAlign: 'left', fontSize: '10px'}}>
                                    CR: {params.regionalCenter}
                                </div>
                                <div>
                                    MAIN D'ŒUVRE A LA TACHE<br/>
                                    <span style={{fontSize: '11px'}}>DU: {formattedStartDate} AU {formattedEndDate}</span>
                                </div>
                                <div style={{textAlign: 'right', fontSize: '10px'}}>
                                    EXERCICE {params.year}/{params.year + 1}
                                </div>
                            </div>
                        </th>
                    </tr>
                    <tr>
                        <th style={thStyle}>N° LA CNSS</th>
                        <th style={thStyle}>N° CIN</th>
                        <th style={thStyle}>NOM ET PRENOM</th>
                        <th style={thStyle}>NBR DE<br/>JOURS</th>
                        <th style={thStyle}>MONTANT</th>
                        <th style={thStyle}>CONGE<br/>PAYE</th>
                        <th style={thStyle}>Jour<br/>Férié</th>
                        <th style={thStyle}>ANCIENNETE</th>
                        <th style={thStyle}>TOTAL</th>
                        <th style={thStyle}>INDEM.<br/>LAIT</th>
                        <th style={thStyle}>PRIME<br/>PANIER</th>
                        <th style={thStyle}>RET.<br/>CNSS</th>
                        <th style={thStyle}>RET.<br/>AMO</th>
                        <th style={thStyle}>AVANCE<br/>AID</th>
                        <th style={thStyle}>IR</th>
                        <th style={thStyle}>NET A<br/>PAYER</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map(d => (
                        <tr key={d.worker.id}>
                            <td style={tdCenterStyle}>{d.worker.cnss}</td>
                            <td style={tdCenterStyle}>{d.worker.matricule}</td>
                            <td style={tdLeftStyle}>{d.worker.name}</td>
                            <td style={tdCenterStyle}>{d.joursTravailles}</td>
                            <td style={tdStyle}>{d.montant.toFixed(2)}</td>
                            <td style={tdStyle}>{d.congePaye.toFixed(2)}</td>
                            <td style={tdStyle}>{d.jourFerier.toFixed(2)}</td>
                            <td style={tdStyle}>{d.anciennete.toFixed(2)}</td>
                            <td style={{...tdStyle, fontWeight: 'bold'}}>{d.total.toFixed(2)}</td>
                            <td style={tdStyle}>{d.indemLait.toFixed(2)}</td>
                            <td style={tdStyle}>{d.primePanier.toFixed(2)}</td>
                            <td style={tdStyle}>{d.retCnss.toFixed(2)}</td>
                            <td style={tdStyle}>{d.retAmo.toFixed(2)}</td>
                            <td style={tdStyle}>{d.avanceAid > 0 ? d.avanceAid.toFixed(2) : '0.00'}</td>
                            <td style={tdStyle}>{d.ir > 0 ? d.ir.toFixed(2) : '0.00'}</td>
                            <td style={{...tdStyle, fontWeight: 'bold'}}>{d.netAPayer.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{backgroundColor: '#e2e8f0'}}>
                        <td colSpan={3} style={{...tdCenterStyle, fontWeight: 'bold'}}>TOTAL GENERAL</td>
                        <td style={{...tdCenterStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.joursTravailles, 0)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.montant, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.congePaye, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.jourFerier, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.anciennete, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.total, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.indemLait, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.primePanier, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.retCnss, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.retAmo, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.avanceAid, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{data.reduce((sum, d) => sum + d.ir, 0).toFixed(2)}</td>
                        <td style={{...tdStyle, fontWeight: 'bold'}}>{grandTotal.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>

            <footer className="mt-4">
                <p className="text-xs">LE PRESENT ETAT EST ARRETE A LA SOMME DE: <span className="font-bold">{totalInWords}</span></p>
                <div className="flex justify-between items-end mt-8 text-center text-xs font-bold font-montserrat">
                    <div style={{width: '30%', textAlign: 'left'}}><p style={{textDecoration: 'underline'}}>LE CHEF DE LA CELLULE FINANCES</p></div>
                    <div style={{width: '30%', textAlign: 'center'}}><p style={{textDecoration: 'underline'}}>LE REGISSEUR</p></div>
                    <div style={{width: '30%', textAlign: 'right'}}><p style={{textDecoration: 'underline'}}>LE CHEF DE CENTRE</p></div>
                </div>
            </footer>
        </div>
    );
}

const DetailedPayrollView: React.FC<DetailedPayrollViewProps> = ({ allLogs, workerGroups, workedDays, onSaveWorkedDays, taskMap, isPrinting = false, savedReports, onSave, onDelete, requestConfirmation, currentUser, onDirectExport, viewingReport: viewingReportForExport }) => {
    const optionsCardRef = useRef<HTMLDivElement>(null);
    useGlow(optionsCardRef);

    const allWorkers = useMemo(() => workerGroups.flatMap(g => g.workers), [workerGroups]);
    const selectableWorkerGroups = useMemo(() => workerGroups.filter(g => !g.isArchived && g.workers.some(w => !w.isArchived)), [workerGroups]);

    // UI Mode State
    const [mode, setMode] = useState<'list' | 'form'>('list');
    
    // Viewing/Editing State
    const [viewingReport, setViewingReport] = useState<SavedDetailedPayroll | null>(null);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [draftAdjustments, setDraftAdjustments] = useState<SavedDetailedPayroll['params']['additionalInputs']>({});
    
    // Form State (for creating new reports)
    const [step, setStep] = useState(1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedPeriod, setSelectedPeriod] = useState<'first' | 'second'>(new Date().getDate() <= 15 ? 'first' : 'second');
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
    const [regionalCenter, setRegionalCenter] = useState('TAZA');
    const [newReportDraft, setNewReportDraft] = useState<SavedDetailedPayroll | null>(null);

    const resetForm = () => {
        setStep(1);
        setSelectedYear(new Date().getFullYear());
        setSelectedMonth(new Date().getMonth() + 1);
        setSelectedPeriod(new Date().getDate() <= 15 ? 'first' : 'second');
        setSelectedWorkerIds([]);
        setRegionalCenter('TAZA');
        setNewReportDraft(null);
        setViewingReport(null);
        setDraftAdjustments({});
    };

    const handleNewReport = () => {
        resetForm();
        setMode('form');
    };
    
    const handleDeleteReport = (report: SavedDetailedPayroll) => {
        requestConfirmation("Confirmer la Suppression", `Êtes-vous sûr de vouloir supprimer ce rapport de paie détaillée ?`, () => {
            onDelete(report);
            setViewingReport(null);
        });
    };
    
    const generateReportData = (workerIds: number[], year: number, month: number, period: 'first' | 'second', currentInputs: Record<number, { avanceAid: string; ir: string }>): DetailedPayrollData[] => {
        const startDateNum = period === 'first' ? 1 : 16;
        const endDateNum = period === 'first' ? 15 : new Date(year, month, 0).getDate();
        const startDateStr = new Date(Date.UTC(year, month - 1, startDateNum)).toISOString().split('T')[0];
        const endDateStr = new Date(Date.UTC(year, month - 1, endDateNum)).toISOString().split('T')[0];

        const getDaysWorkedForWorker = (workerId: number) => workedDays.find(d => d.workerId === workerId && d.year === year && d.month === month && d.period === period)?.days || 0;
        
        return workerIds.map(workerId => {
            const worker = allWorkers.find(w => w.id === workerId);
            if (!worker) return null;

            const joursTravailles = getDaysWorkedForWorker(workerId);
            const workerLogs = allLogs.filter(log => log.date >= startDateStr && log.date <= endDateStr && log.workerId === workerId);

            const montant = workerLogs.filter(l => l.taskId !== LAIT_TASK_ID && l.taskId !== PANIER_TASK_ID).reduce((sum, log) => sum + (log.quantity * (taskMap.get(log.taskId)?.price || 0)), 0);
            const anciennete = montant * (worker.seniorityPercentage / 100);
            const total = montant + anciennete;
            const indemLait = joursTravailles * (taskMap.get(LAIT_TASK_ID)?.price || 0);
            const primePanier = joursTravailles * (taskMap.get(PANIER_TASK_ID)?.price || 0);
            const retCnss = total * RET_CNSS_RATE;
            const retAmo = total * RET_AMO_RATE;
            const avanceAid = parseFloat(currentInputs[workerId]?.avanceAid || '0') || 0;
            const ir = parseFloat(currentInputs[workerId]?.ir || '0') || 0;
            const netAPayer = total + indemLait + primePanier - retCnss - retAmo - avanceAid - ir;

            return { worker, montant, anciennete, total, indemLait, primePanier, retCnss, retAmo, avanceAid, ir, netAPayer, joursTravailles, congePaye: 0, jourFerier: 0 };
        }).filter((item): item is DetailedPayrollData => item !== null);
    }
    
    const handleNextStep = () => {
        if (selectedWorkerIds.length === 0) {
            alert("Veuillez sélectionner au moins un ouvrier.");
            return;
        }
        setStep(2);
    };

    const handleGenerateDraft = () => {
        const initialInputs = selectedWorkerIds.reduce((acc, id) => ({...acc, [id]: { avanceAid: '', ir: '' }}), {});
        const data = generateReportData(selectedWorkerIds, selectedYear, selectedMonth, selectedPeriod, initialInputs);
        const report: SavedDetailedPayroll = {
            id: '', owner: currentUser.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            params: { year: selectedYear, month: selectedMonth, period: selectedPeriod, regionalCenter, workerIds: selectedWorkerIds, additionalInputs: initialInputs },
            data: data.sort((a,b) => a.worker.name.localeCompare(b.worker.name)),
        };
        setNewReportDraft(report);
    };
    
    const handleSaveNewReport = () => {
        if (!newReportDraft) return;
        onSave(newReportDraft);
        resetForm();
        setMode('list');
    };
    
    const handleOpenAdjustmentModal = () => {
        if (!viewingReport) return;
        setDraftAdjustments(JSON.parse(JSON.stringify(viewingReport.params.additionalInputs || {})));
        setIsAdjustmentModalOpen(true);
    };

    const handleSaveAdjustments = () => {
        if (!viewingReport) return;
        
        const { workerIds, year, month, period } = viewingReport.params;
        const updatedData = generateReportData(workerIds, year, month, period, draftAdjustments);

        const updatedReport: SavedDetailedPayroll = {
            ...viewingReport,
            params: { ...viewingReport.params, additionalInputs: draftAdjustments },
            data: updatedData.sort((a,b) => a.worker.name.localeCompare(b.worker.name)),
            updatedAt: new Date().toISOString(),
        };

        onSave(updatedReport);
        setViewingReport(updatedReport);
        setIsAdjustmentModalOpen(false);
    };


    if (isPrinting) {
        const reportToPrint = viewingReport || viewingReportForExport;
        if (reportToPrint) return <ReportContent report={reportToPrint} id="detailed-payroll-content" />;
        return null;
    }

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('fr-FR', { month: 'long' }) }));
    
    return (
        <div className="space-y-8">
            {mode === 'list' && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-slate-800">Rapports de Paie Détaillée</h2><button onClick={handleNewReport} className="flex items-center gap-2 px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800"><span>Générer un nouveau rapport</span></button></div>
                    {savedReports.length > 0 ? (
                        <ul className="space-y-3">{savedReports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(report => (
                            <li key={report.id} className="p-4 border rounded-lg hover:bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                                <div><button onClick={() => setViewingReport(report)} className="font-semibold text-sonacos-green hover:underline text-left">Paie Détaillée - Période du {report.params.period === 'first' ? '01' : '16'}/{report.params.month}/{report.params.year}</button><p className="text-sm text-slate-500">Créé le: {new Date(report.createdAt).toLocaleString('fr-FR')}</p></div>
                                <div className="flex items-center gap-2">
                                    <ExportMenu onPrint={() => onDirectExport(report, 'print')} onExportPDF={() => onDirectExport(report, 'pdf')} onExportExcel={() => onDirectExport(report, 'excel')} />
                                    <button onClick={() => setViewingReport(report)} title="Aperçu" className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => handleDeleteReport(report)} title="Supprimer" className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
                                </div>
                            </li>
                        ))}</ul>
                    ) : <p className="text-center py-8 text-slate-500">Aucun rapport sauvegardé.</p>}
                </div>
            )}

            {mode === 'form' && step === 1 && (
                <div ref={optionsCardRef} className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Étape 1: Sélection Période & Ouvriers</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                        <div className="md:col-span-1"><label className="block text-sm font-medium">Année</label><select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="w-full p-2 border rounded-md">{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
                        <div className="md:col-span-1"><label className="block text-sm font-medium">Mois</label><select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="w-full p-2 border rounded-md">{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
                        <div className="md:col-span-1"><label className="block text-sm font-medium">Période</label><select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value as 'first' | 'second')} className="w-full p-2 border rounded-md"><option value="first">1 - 15</option><option value="second">16 - Fin</option></select></div>
                        <div className="md:col-span-1"><label className="block text-sm font-medium">Centre Régional</label><input type="text" value={regionalCenter} onChange={e => setRegionalCenter(e.target.value)} className="w-full p-2 border rounded-md"/></div>
                        <div className="md:col-span-4"><label className="block text-sm font-medium">Ouvrier(s)</label><WorkerMultiSelect workerGroups={selectableWorkerGroups} selectedWorkerIds={selectedWorkerIds} onChange={setSelectedWorkerIds} /></div>
                    </div>
                    <div className="flex justify-between mt-6"><button onClick={() => { setMode('list'); resetForm(); }} className="px-4 py-2 bg-slate-200 rounded-lg">Annuler</button><button onClick={handleNextStep} className="px-4 py-2 bg-sonacos-blue-grey text-white rounded-lg">Suivant</button></div>
                </div>
            )}
            
            {mode === 'form' && step === 2 && (
                 <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Étape 2: Générer Rapport</h2>
                     <p className="text-sm text-slate-600 mb-4">Un rapport initial sera généré. Vous pourrez ensuite modifier les avances et l'impôt sur le revenu (IR) avant de sauvegarder.</p>
                     <div className="flex justify-between mt-6">
                        <button onClick={() => setStep(1)} className="px-4 py-2 bg-slate-200 rounded-lg">Précédent</button>
                        <button onClick={handleGenerateDraft} className="px-4 py-2 bg-sonacos-teal-dark text-white rounded-lg">Générer le Brouillon</button>
                    </div>
                 </div>
            )}
            
            {(viewingReport || newReportDraft) && (
                <div className="bg-slate-200 p-8 rounded-lg">
                    <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">{viewingReport ? 'Aperçu' : 'Brouillon du Nouveau Rapport'}</h2><div>
                        {viewingReport && <ExportMenu onPrint={() => onDirectExport(viewingReport, 'print')} onExportPDF={() => onDirectExport(viewingReport, 'pdf')} onExportExcel={() => onDirectExport(viewingReport, 'excel')} />}
                        {newReportDraft && <button onClick={handleSaveNewReport} className="px-4 py-2 bg-sonacos-green text-white rounded-lg">Sauvegarder le Nouveau Rapport</button>}
                    </div></div>
                    <div className="bg-white shadow-2xl mx-auto max-w-6xl">
                      {(viewingReport || newReportDraft) && <ReportContent report={viewingReport || newReportDraft!} id="detailed-payroll-content" />}
                    </div>
                    <div className="flex justify-center mt-4 gap-4">
                        <button onClick={() => { setViewingReport(null); setNewReportDraft(null); if (mode === 'form') { resetForm(); setMode('list'); } }} className="px-4 py-2 bg-slate-500 rounded-lg">Fermer</button>
                        {(viewingReport || newReportDraft) && <button onClick={handleOpenAdjustmentModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Modifier les Ajustements</button>}
                    </div>
                </div>
            )}
             <AdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => setIsAdjustmentModalOpen(false)}
                workers={(viewingReport || newReportDraft)?.data.map(d => d.worker) || []}
                adjustments={draftAdjustments}
                onAdjustmentsChange={setDraftAdjustments}
                onSave={handleSaveAdjustments}
            />
        </div>
    );
};

export default DetailedPayrollView;