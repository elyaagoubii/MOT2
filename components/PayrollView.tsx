import React, { useState, useMemo } from 'react';
import { Worker, PayrollData, SavedPayroll, User, Task } from '../types';
import { getDynamicTaskByIdWithFallback } from '../constants';
import { printElement, exportToExcel, exportToPDF } from '../utils/exportUtils';
import ExportMenu from './ExportMenu';
import { createRipple } from '../utils/effects';
import Modal from './Modal';


interface PayrollViewProps {
    workerGroups: any; // Keep any for simplicity if worker structure is complex/not needed
    taskMap: Map<number, Task & { category: string }>;
    isPrinting?: boolean;
    savedReports: SavedPayroll[];
    onSave: (report: SavedPayroll) => void;
    onDelete: (report: SavedPayroll) => void;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
    currentUser: User;
    onDirectExport: (report: SavedPayroll, format: 'print' | 'pdf' | 'excel') => void;
    viewingReport?: SavedPayroll | null;
    onRetroactiveGenerate: () => void;
}

const LAIT_TASK_ID = 37;
const PANIER_TASK_ID = 47;

const AdjustmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    workers: Worker[];
    adjustments: SavedPayroll['params']['additionalInputs'];
    onAdjustmentsChange: (adjustments: SavedPayroll['params']['additionalInputs']) => void;
    onSave: () => void;
}> = ({ isOpen, onClose, workers, adjustments, onAdjustmentsChange, onSave }) => {

    const handleFieldChange = (workerId: number, field: 'avance' | 'jourFerier', value: string) => {
        const updatedAdjustments = { ...adjustments };
        if (!updatedAdjustments[workerId]) {
            updatedAdjustments[workerId] = { avance: '', jourFerier: '' };
        }
        updatedAdjustments[workerId][field] = value;
        onAdjustmentsChange(updatedAdjustments);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ajustements pour le Décompte">
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Modifiez les avances ou les jours fériés pour chaque ouvrier. Les totaux seront recalculés après la sauvegarde.
                </p>
                <div className="max-h-80 overflow-y-auto space-y-3 p-2 border rounded-md bg-slate-50">
                    {workers.sort((a,b) => a.name.localeCompare(b.name)).map(worker => (
                        <div key={worker.id} className="p-3 border rounded-md bg-white grid grid-cols-2 gap-4 items-end">
                             <p className="font-semibold col-span-2">{worker.name}</p>
                             <div>
                                <label className="text-xs font-medium text-slate-600">Avance s/d</label>
                                <input
                                    type="number"
                                    value={adjustments[worker.id]?.avance || ''}
                                    onChange={e => handleFieldChange(worker.id, 'avance', e.target.value)}
                                    className="w-full p-1.5 border border-slate-300 rounded-md"
                                    placeholder="0.00"
                                />
                             </div>
                              <div>
                                <label className="text-xs font-medium text-slate-600">Jour Férié</label>
                                <input
                                    type="number"
                                    value={adjustments[worker.id]?.jourFerier || ''}
                                    onChange={e => handleFieldChange(worker.id, 'jourFerier', e.target.value)}
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


const PayrollView: React.FC<PayrollViewProps> = ({ taskMap, isPrinting = false, savedReports, onSave, onDelete, requestConfirmation, currentUser, onDirectExport, viewingReport: viewingReportForExport, onRetroactiveGenerate }) => {
    
    const [viewingReport, setViewingReport] = useState<SavedPayroll | null>(null);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [draftAdjustments, setDraftAdjustments] = useState<SavedPayroll['params']['additionalInputs']>({});


    const handleDeleteReport = (report: SavedPayroll) => {
        requestConfirmation("Confirmer la Suppression", `Êtes-vous sûr de vouloir supprimer ce décompte du ${new Date(report.createdAt).toLocaleString('fr-FR')}?`, () => {
            onDelete(report);
            setViewingReport(null);
        });
    };
    
    const handleOpenAdjustmentModal = () => {
        if (!viewingReport) return;
        // Deep copy for safety
        setDraftAdjustments(JSON.parse(JSON.stringify(viewingReport.params.additionalInputs || {})));
        setIsAdjustmentModalOpen(true);
    };

    const handleSaveAdjustments = () => {
        if (!viewingReport) return;
    
        // Create a deep copy of the report to modify
        const updatedReport: SavedPayroll = JSON.parse(JSON.stringify(viewingReport));
        updatedReport.params.additionalInputs = draftAdjustments;
        
        // Recalculate data based on new adjustments
        const newData = updatedReport.data.map((d: PayrollData) => {
            const jourFerierValue = draftAdjustments[d.worker.id]?.jourFerier;
            const jourFerier = jourFerierValue !== undefined && jourFerierValue !== '' ? parseFloat(jourFerierValue) : 0;
            const totalBrut = d.totalOperation + d.anciennete + (isNaN(jourFerier) ? 0 : jourFerier);
            const retenu = totalBrut * 0.0674;
            return { ...d, jourFerier: (isNaN(jourFerier) ? 0 : jourFerier), totalBrut, retenu };
        });
        
        updatedReport.data = newData;
        updatedReport.updatedAt = new Date().toISOString();

        onSave(updatedReport);
        setViewingReport(updatedReport); // Update the view with the saved data
        setIsAdjustmentModalOpen(false);
    };


    const sortedSavedReports = useMemo(() => 
        [...savedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    , [savedReports]);

    const formatTaskName = (task: Task & { category: string }) => {
        let desc = task.description;
        // Simplify description to fit the narrow column in the new layout
        desc = desc.replace("Impression étiquettes (interne et externe du sac)", "Impression étiquettes");
        desc = desc.replace(/APPROVISIONEMENT/g, "APPRO");
        desc = desc.replace(/TRANSFERT HORS ZONE/gi, "THZ");
        desc = desc.replace(/TRANFERTS HORS ZONE/gi, "THZ");
        
        // Very aggressive shortening for the detailed list
        const cerealListRegex = /Céréales, mais, (tournesol, )?l'orge, luzerne, (Légumineuse|légumineuse)(, riz)?/gi;
        desc = desc.replace(cerealListRegex, "Céréales...");
        desc = desc.replace(/Bettrave, tournesol, luzerne, mais/gi, "Betterave...");

        return desc;
    };

    const ReportContent: React.FC<{ report: SavedPayroll, id: string }> = ({ report, id }) => {
        const { params, data } = report;
        const laitPricePerDay = taskMap.get(LAIT_TASK_ID)?.price || 0;
        const panierPricePerDay = taskMap.get(PANIER_TASK_ID)?.price || 0;

        const grandTotals = useMemo(() => data.reduce((totals, d) => {
            const avance = parseFloat(params.additionalInputs[d.worker.id]?.avance || '0') || 0;
            const indemniteLait = d.joursTravailles * laitPricePerDay;
            const primePanier = d.joursTravailles * panierPricePerDay;
            const net = d.totalBrut - d.retenu + indemniteLait + primePanier - avance;

            return {
                totalOperation: totals.totalOperation + d.totalOperation, 
                anciennete: totals.anciennete + d.anciennete,
                jourFerier: totals.jourFerier + d.jourFerier,
                totalBrut: totals.totalBrut + d.totalBrut,
                retenu: totals.retenu + d.retenu, 
                lait: totals.lait + indemniteLait, 
                panier: totals.panier + primePanier, 
                avance: totals.avance + avance, 
                net: totals.net + net,
            };
        }, { totalOperation: 0, anciennete: 0, totalBrut: 0, retenu: 0, lait: 0, panier: 0, avance: 0, net: 0, jourFerier: 0 }), [data, params.additionalInputs, laitPricePerDay, panierPricePerDay]);
        
        const formattedStartDate = new Date(params.startDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const formattedEndDate = new Date(params.endDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        // Styles specifically matching the "Etat n°09" document
        const tableStyle = { 
            fontSize: '10px',
            fontFamily: 'Arial, sans-serif',
            borderCollapse: 'collapse' as const, 
            width: '100%', 
            tableLayout: 'fixed' as const 
        };
        
        const titleRowStyle = {
            border: 'none',
            textAlign: 'center' as const,
            fontWeight: '800',
            fontSize: '16px',
            fontFamily: 'Montserrat, sans-serif',
            padding: '0',
            lineHeight: '1.2',
            backgroundColor: 'white',
            textTransform: 'uppercase' as const
        };

        const metaRowStyle = {
            border: 'none',
            padding: '5px 2px',
            textAlign: 'left' as const,
            fontSize: '10px',
            backgroundColor: 'white'
        };
        
        const thStyle = { 
            border: '1px solid #000', 
            padding: '8px 4px', 
            verticalAlign: 'middle', 
            textAlign: 'center' as const, 
            backgroundColor: '#e2e8f0', 
            fontWeight: '900', 
            fontSize: '11px', 
            fontFamily: 'Montserrat, sans-serif',
            whiteSpace: 'normal' as const,
            height: 'auto'
        };

        const tdStyle = { 
            border: '1px solid #000', 
            padding: '4px 4px', 
            verticalAlign: 'middle', 
            textAlign: 'center' as const,
            // height: '22px', // Removed fixed height to allow wrapping
            lineHeight: '1.1',
            whiteSpace: 'nowrap' as const,
            // overflow: 'hidden' as const // Removed overflow hidden
        };
        
        const tdLeftStyle = { ...tdStyle, textAlign: 'left' as const, whiteSpace: 'normal' as const };
        const tdMergedStyle = { ...tdStyle, backgroundColor: '#fff' }; 
        
        return (
            <div id={id} className="printable-report bg-white p-4 printable-a4 landscape-print">
                <table className="w-full data-table" style={tableStyle}>
                    <colgroup>
                        <col style={{ width: '30px' }} /> {/* N° */}
                        <col style={{ width: '200px' }} /> {/* Nom - Widened */}
                        <col style={{ width: '80px' }} /> {/* Emplois */}
                        <col style={{ width: '40px' }} /> {/* Enfants */}
                        <col style={{ width: '400px' }} /> {/* Nature Tache - Widened significantly */}
                        <col style={{ width: '50px' }} /> {/* Qté */}
                        <col style={{ width: '45px' }} /> {/* PU */}
                        <col style={{ width: '65px' }} /> {/* Montant */}
                        <col style={{ width: '65px' }} /> {/* Total */}
                        <col style={{ width: '50px' }} /> {/* Fériés */}
                        <col style={{ width: '35px' }} /> {/* Anc % */}
                        <col style={{ width: '50px' }} /> {/* Anc Mnt */}
                        <col style={{ width: '65px' }} /> {/* Total Brut */}
                        <col style={{ width: '50px' }} /> {/* Retenu */}
                        <col style={{ width: '50px' }} /> {/* Lait */}
                        <col style={{ width: '50px' }} /> {/* Panier */}
                        <col style={{ width: '50px' }} /> {/* Avance */}
                        <col style={{ width: '70px' }} /> {/* Net */}
                    </colgroup>
                    <thead>
                        <tr><th colSpan={18} style={titleRowStyle}>Etat n°09</th></tr>
                        <tr><th colSpan={18} style={titleRowStyle}>DEPENSE EN REGIE</th></tr>
                        <tr><th colSpan={18} style={titleRowStyle}>DEPENSES DE PERSONNEL A LA TACHE</th></tr>

                        <tr>
                            <th colSpan={18} style={metaRowStyle}>
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                                    <div style={{ width: '60%' }}>
                                        <p style={{margin: 0, lineHeight: '1.2'}}><strong>Année :</strong> 2025/2026</p>
                                        <p style={{margin: 0, lineHeight: '1.2'}}><strong>Centre Régional :</strong> {params.centreRegional.toUpperCase()}</p>
                                        <p style={{margin: 0, lineHeight: '1.2'}}><strong>Régie de dépenses de TAZA</strong></p>
                                        <p style={{margin: 0, lineHeight: '1.2', fontSize: '10px'}}>Régie de dépenses auprès du Centre Régional de TAZA Année : 2025/2026</p>
                                        <p style={{marginTop: '4px', fontSize: '12px', border: '1px solid #000', display: 'inline-block', padding: '2px 8px', backgroundColor: '#f8fafc'}}><strong>Somme à payer :</strong> {grandTotals.net.toFixed(2)} DH</p>
                                    </div>
                                    <div style={{ width: '40%', textAlign: 'right' }}>
                                         <p style={{ fontWeight: 'bold', fontSize: '12px', borderBottom: '1px solid #000', paddingBottom: '2px', display: 'inline-block' }}>DATE : du {formattedStartDate} au {formattedEndDate}</p>
                                    </div>
                                </div>
                            </th>
                        </tr>

                        <tr>
                            <th rowSpan={2} style={thStyle}>N°<br/>ordre</th>
                            <th rowSpan={2} style={thStyle}>Nom et prenom</th>
                            <th rowSpan={2} style={thStyle}>Emplois</th>
                            <th rowSpan={2} style={thStyle}>Nombre<br/>d'enfants</th>
                            <th rowSpan={2} style={thStyle}>NATURE DE TACHE</th>
                            <th rowSpan={2} style={thStyle}>Nbr unite<br/>qté</th>
                            <th rowSpan={2} style={thStyle}>P.U</th>
                            <th rowSpan={2} style={thStyle}>MONTANT<br/>PAR<br/>OPERATION</th>
                            <th rowSpan={2} style={thStyle}>TOTAL</th>
                            <th rowSpan={2} style={thStyle}>Jours<br/>Fériés</th>
                            <th colSpan={2} style={thStyle}>Ancienneté</th>
                            <th rowSpan={2} style={thStyle}>TOTAL<br/>BRUT</th>
                            <th rowSpan={2} style={thStyle}>RETENU<br/>CNSS<br/>AMO</th>
                            <th rowSpan={2} style={thStyle}>Indemnité<br/>Lait</th>
                            <th rowSpan={2} style={thStyle}>Prime<br/>panier</th>
                            <th rowSpan={2} style={thStyle}>Avance</th>
                            <th rowSpan={2} style={thStyle}>NET A<br/>PAYER</th>
                        </tr>
                        <tr>
                            <th style={thStyle}>Taux</th>
                            <th style={thStyle}>Mnt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((d, workerIndex) => {
                            const numTasks = d.tasks.length || 1;
                            
                            const avance = parseFloat(params.additionalInputs[d.worker.id]?.avance || '0') || 0;
                            const indemniteLait = d.joursTravailles * laitPricePerDay;
                            const primePanier = d.joursTravailles * panierPricePerDay;
                            const netAPayer = d.totalBrut - d.retenu + indemniteLait + primePanier - avance;
                            const roleDescription = "Main\nd'œuvre à la\ntache";

                            const renderRow = (task: any, taskIndex: number) => {
                                const taskInfo = task ? getDynamicTaskByIdWithFallback(task.taskId, taskMap) : null;
                                const formattedTaskDescription = taskInfo ? formatTaskName(taskInfo) : '-';
                                const isFirstTask = taskIndex === 0;

                                return (
                                <tr key={task ? `${d.worker.id}-${task.taskId}` : `${d.worker.id}-empty`}>
                                    {isFirstTask && (
                                        <>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{workerIndex + 1}</td>
                                            <td rowSpan={numTasks} style={{...tdLeftStyle, ...tdMergedStyle, fontWeight: 'bold', textAlign: 'center'}}>{d.worker.name}</td>
                                            <td rowSpan={numTasks} style={{...tdStyle, ...tdMergedStyle, fontSize: '9px', whiteSpace: 'normal', textAlign: 'center'}}>{roleDescription}</td>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{d.worker.numberOfChildren > 0 ? d.worker.numberOfChildren : ''}</td>
                                        </>
                                    )}
                                    <td style={{...tdLeftStyle, fontSize: '9px'}}>
                                        {taskInfo ? (
                                            taskInfo.category === 'Opérations Diverses' || taskInfo.category === 'À METTRE À JOUR' ? (
                                                 <span style={{fontWeight: 'bold', fontSize: '10px'}}>{formattedTaskDescription}</span>
                                            ) : (
                                                 <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2px 0'}}>
                                                    <span style={{fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', display: 'block', paddingBottom: '2px'}}>{taskInfo.category}</span>
                                                    <span style={{fontSize: '9px', fontWeight: 'normal'}}>{formattedTaskDescription}</span>
                                                 </div>
                                            )
                                        ) : '-'}
                                    </td>
                                    <td style={tdStyle}>{task ? task.quantity.toFixed(2) : '-'}</td>
                                    <td style={tdStyle}>{task ? task.price.toFixed(2) : '-'}</td>
                                    <td style={tdStyle}>{task ? task.amount.toFixed(2) : '-'}</td>
                                    <td style={tdStyle}>{task ? task.amount.toFixed(2) : '-'}</td> 
                                    
                                    {isFirstTask && (
                                        <>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{d.jourFerier > 0 ? d.jourFerier.toFixed(2) : ''}</td>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{d.worker.seniorityPercentage > 0 ? `${d.worker.seniorityPercentage}%` : ''}</td>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{d.anciennete > 0 ? d.anciennete.toFixed(2) : ''}</td>
                                            <td rowSpan={numTasks} style={{...tdMergedStyle, fontWeight: 'bold'}}>{d.totalBrut.toFixed(2)}</td>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{d.retenu.toFixed(2)}</td>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{indemniteLait > 0 ? indemniteLait.toFixed(2) : ''}</td>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{primePanier > 0 ? primePanier.toFixed(2) : ''}</td>
                                            <td rowSpan={numTasks} style={tdMergedStyle}>{avance > 0 ? avance.toFixed(2) : ''}</td>
                                            <td rowSpan={numTasks} style={{...tdMergedStyle, fontWeight: 'bold', fontSize: '10px'}}>{netAPayer.toFixed(2)}</td>
                                        </>
                                    )}
                                </tr>
                            )};
                            return d.tasks.length > 0 ? d.tasks.map(renderRow) : renderRow(null, 0);
                        })}
                        
                        <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                            <td colSpan={8} style={{...tdStyle, textAlign: 'right', paddingRight: '10px'}}>SOUS TOTAL</td>
                            <td style={tdStyle}>{grandTotals.totalOperation.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.jourFerier.toFixed(2)}</td>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}>{grandTotals.anciennete.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.totalBrut.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.retenu.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.lait.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.panier.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.avance.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.net.toFixed(2)}</td>
                        </tr>
                        
                         <tr style={{ fontWeight: 'bold', backgroundColor: '#e0e0e0' }}>
                            <td colSpan={8} style={{...tdStyle, textAlign: 'center'}}>TOTAL GENERAL</td>
                            <td style={tdStyle}>{grandTotals.totalOperation.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.jourFerier.toFixed(2)}</td>
                            <td style={tdStyle}></td>
                            <td style={tdStyle}>{grandTotals.anciennete.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.totalBrut.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.retenu.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.lait.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.panier.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.avance.toFixed(2)}</td>
                            <td style={tdStyle}>{grandTotals.net.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                 <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', width: '100%', pageBreakInside: 'avoid', fontFamily: 'Montserrat, sans-serif', fontSize: '11px' }}>
                    <div style={{ textAlign: 'left', width: '30%' }}>
                         <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Le Magasinier</p>
                    </div>
                     <div style={{ textAlign: 'center', width: '30%' }}>
                         <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Le Contrôleur</p>
                    </div>
                    <div style={{ textAlign: 'right', width: '30%' }}>
                         <p style={{ fontWeight: 'bold', textDecoration: 'underline' }}>Le Chef de Centre</p>
                    </div>
                </div>
            </div>
        );
    }
    
    const reportToPrint = viewingReport || viewingReportForExport;
    if (isPrinting && reportToPrint) {
        return <ReportContent report={reportToPrint} id="payroll-content" />;
    }
    
    if (viewingReport) {
        return (
             <div className="bg-slate-200 p-8 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Aperçu du Décompte</h2>
                    <div className="flex items-center gap-3">
                         <ExportMenu 
                            onPrint={() => printElement('payroll-content', 'Décompte de Paie', 'landscape')} 
                            onExportPDF={() => exportToPDF('payroll-content', 'DecomptePaie', 'landscape')} 
                            onExportExcel={() => exportToExcel('payroll-content', 'DecomptePaie')} 
                         />
                    </div>
                </div>
                <div className="bg-white shadow-2xl mx-auto" id="payroll-content-wrapper">
                     <ReportContent report={viewingReport} id="payroll-content" />
                </div>
                <div className="flex justify-center mt-4 gap-4">
                    <button onClick={() => setViewingReport(null)} className="px-4 py-2 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600">Fermer</button>
                    <button onClick={handleOpenAdjustmentModal} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">Modifier les Ajustements</button>
                </div>
                <AdjustmentModal
                    isOpen={isAdjustmentModalOpen}
                    onClose={() => setIsAdjustmentModalOpen(false)}
                    workers={viewingReport.data.map(d => d.worker)}
                    adjustments={draftAdjustments}
                    onAdjustmentsChange={setDraftAdjustments}
                    onSave={handleSaveAdjustments}
                />
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Décomptes de Paie Sauvegardés</h2>
                    <p className="text-sm text-slate-500">Générés automatiquement depuis les États Bi-mensuels.</p>
                </div>
                <button onClick={(e) => { createRipple(e); onRetroactiveGenerate(); }} className="px-4 py-2 bg-sonacos-teal-dark text-white font-semibold rounded-lg hover:bg-slate-700">
                    Générer les décomptes manquants pour les anciennes périodes
                </button>
            </div>
            {sortedSavedReports.length > 0 ? (
                <ul className="space-y-3">
                    {sortedSavedReports.map(report => (
                        <li key={report.id} className="p-4 border rounded-lg hover:bg-slate-50 flex justify-between items-center flex-wrap gap-2">
                            <div>
                                <button onClick={() => setViewingReport(report)} className="font-semibold text-sonacos-green hover:underline text-left">
                                    Décompte du {report.params.startDate} au {report.params.endDate}
                                </button>
                                <p className="text-sm text-slate-500">
                                    Créé le: {new Date(report.createdAt).toLocaleString('fr-FR')}
                                    {currentUser.role === 'superadmin' && ` par ${report.owner}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <ExportMenu 
                                    onPrint={() => onDirectExport(report, 'print')}
                                    onExportPDF={() => onDirectExport(report, 'pdf')}
                                    onExportExcel={() => onDirectExport(report, 'excel')}
                                />
                                 <button onClick={() => setViewingReport(report)} title="Aperçu" className="p-2 text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                </button>
                                <button onClick={() => handleDeleteReport(report)} className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-red-100">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-center py-8 text-slate-500">Aucun décompte de paie sauvegardé.</p>}
        </div>
    );
};

export default PayrollView;