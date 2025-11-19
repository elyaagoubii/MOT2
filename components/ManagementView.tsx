import React, { useState, FormEvent, useRef } from 'react';
import { Worker, WorkerGroup, User } from '../types';
import Modal from './Modal';
import { playHoverSound, playClickSound } from '../utils/audioUtils';
import { createRipple, useGlow } from '../utils/effects';

interface ManagementViewProps {
    workerGroups: WorkerGroup[];
    currentUser: User;
    onAddGroup: (groupName: string) => void;
    onEditGroup: (groupId: number, newGroupName: string, ownerId: string) => void;
    onArchiveGroup: (groupId: number, ownerId: string) => void;
    onDeleteGroupPermanently: (groupId: number, ownerId: string) => void;
    onAddWorker: (groupId: number, workerData: Omit<Worker, 'id'>, ownerId: string) => void;
    onEditWorker: (workerId: number, updatedWorkerData: Omit<Worker, 'id'>) => void;
    onArchiveWorker: (workerId: number) => void;
    onDeleteWorkerPermanently: (workerId: number) => void;
    onMoveWorker: (workerId: number, targetGroupId: number) => void;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
}

const GroupCard: React.FC<{ group: WorkerGroup; children: React.ReactNode }> = ({ group, children }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    useGlow(cardRef);

    return (
        <div ref={cardRef} key={group.id} className="interactive-glow bg-white rounded-lg shadow-lg border border-slate-200 flex flex-col transition-all duration-300 transform hover:scale-[1.01] hover:shadow-2xl" onMouseEnter={playHoverSound}>
            {children}
        </div>
    );
}

const ManagementView: React.FC<ManagementViewProps> = ({ 
    workerGroups, 
    currentUser,
    onAddGroup, 
    onEditGroup, 
    onArchiveGroup,
    onDeleteGroupPermanently,
    onAddWorker,
    onEditWorker,
    onArchiveWorker,
    onDeleteWorkerPermanently: onDeleteWorker,
    onMoveWorker,
    requestConfirmation,
}) => {
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isWorkerModalOpen, setWorkerModalOpen] = useState(false);
    const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);

    const [editingGroup, setEditingGroup] = useState<WorkerGroup | null>(null);
    const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
    const [movingWorker, setMovingWorker] = useState<Worker | null>(null);

    const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);
    const [currentGroupOwner, setCurrentGroupOwner] = useState<string | null>(null);

    // Form States
    const [groupName, setGroupName] = useState('');
    const [workerName, setWorkerName] = useState('');
    const [workerMatricule, setWorkerMatricule] = useState('');
    const [workerDepartement, setWorkerDepartement] = useState('');
    const [workerRib, setWorkerRib] = useState('');
    const [workerCnss, setWorkerCnss] = useState('');
    const [workerBankCode, setWorkerBankCode] = useState('');
    const [workerSeniority, setWorkerSeniority] = useState<number | ''>('');
    const [workerChildren, setWorkerChildren] = useState<number | ''>('');
    const [targetGroupId, setTargetGroupId] = useState<number | ''>('');


    const openGroupModal = (group: WorkerGroup | null = null) => {
        playClickSound();
        setEditingGroup(group);
        setGroupName(group ? group.groupName : '');
        setGroupModalOpen(true);
    };

    const closeGroupModal = () => {
        setGroupModalOpen(false);
        setEditingGroup(null);
        setGroupName('');
    };

    const handleGroupSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!groupName.trim()) return;
        if (editingGroup) {
            onEditGroup(editingGroup.id, groupName.trim(), editingGroup.owner!);
        } else {
            onAddGroup(groupName.trim());
        }
        closeGroupModal();
    };
    
    const openWorkerModal = (groupId: number, ownerId: string, worker: Worker | null = null) => {
        playClickSound();
        setCurrentGroupId(groupId);
        setCurrentGroupOwner(ownerId);
        setEditingWorker(worker);
        setWorkerName(worker ? worker.name : '');
        setWorkerMatricule(worker ? worker.matricule : '');
        setWorkerDepartement(worker ? worker.departement : '');
        setWorkerRib(worker ? worker.rib : '');
        setWorkerCnss(worker ? worker.cnss : '');
        setWorkerBankCode(worker ? worker.bankCode || '' : '');
        setWorkerSeniority(worker ? worker.seniorityPercentage : '');
        setWorkerChildren(worker ? worker.numberOfChildren : '');
        setWorkerModalOpen(true);
    };
    
    const closeWorkerModal = () => {
        setWorkerModalOpen(false);
        setEditingWorker(null);
        setCurrentGroupId(null);
        setCurrentGroupOwner(null);
        setWorkerName('');
        setWorkerMatricule('');
        setWorkerDepartement('');
        setWorkerRib('');
        setWorkerCnss('');
        setWorkerBankCode('');
        setWorkerSeniority('');
        setWorkerChildren('');
    };

    const handleWorkerSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!workerName.trim() || !workerMatricule.trim() || !workerDepartement.trim() || !workerRib.trim() || !workerCnss.trim() || workerSeniority === '' || workerChildren === '') {
            alert("Veuillez remplir tous les champs de l'ouvrier.");
            return;
        }
        const workerData = {
            name: workerName.trim(),
            matricule: workerMatricule.trim(),
            departement: workerDepartement.trim(),
            rib: workerRib.trim(),
            cnss: workerCnss.trim(),
            bankCode: workerBankCode.trim(),
            seniorityPercentage: Number(workerSeniority),
            numberOfChildren: Number(workerChildren),
        };
        if (editingWorker) {
            onEditWorker(editingWorker.id, workerData);
        } else if(currentGroupId && currentGroupOwner) {
            onAddWorker(currentGroupId, workerData, currentGroupOwner);
        }
        closeWorkerModal();
    };

    const findWorkerGroup = (workerId: number) => {
        return workerGroups.find(g => g && Array.isArray(g.workers) && g.workers.some(w => w && w.id === workerId));
    }

    const openMoveWorkerModal = (worker: Worker) => {
        playClickSound();
        setMovingWorker(worker);
        setTargetGroupId('');
        setIsMoveModalOpen(true);
    };

    const closeMoveWorkerModal = () => {
        setIsMoveModalOpen(false);
        setMovingWorker(null);
        setTargetGroupId('');
    };

    const handleMoveSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (movingWorker && targetGroupId !== '') {
            onMoveWorker(movingWorker.id, Number(targetGroupId));
            closeMoveWorkerModal();
        }
    };
    
    const handleArchiveGroup = (group: WorkerGroup) => {
        requestConfirmation(
            "Confirmer l'Archivage",
            `Êtes-vous sûr de vouloir archiver le groupe "${group.groupName}" ? Tous les ouvriers de ce groupe seront également masqués.`,
            () => onArchiveGroup(group.id, group.owner!)
        );
    };

    const handlePermanentDeleteGroup = (group: WorkerGroup) => {
        requestConfirmation(
            "Suppression Définitive du Groupe",
            <div className="space-y-2">
                <p>Êtes-vous sûr de vouloir supprimer définitivement le groupe "<strong>{group.groupName}</strong>" appartenant à un utilisateur inconnu ?</p>
                <p className="font-bold text-red-600">Cette action est irréversible et ne peut pas être annulée.</p>
                <p className="text-sm text-slate-500">Cela ne supprimera pas les saisies existantes des ouvriers qui étaient dans ce groupe.</p>
            </div>,
            () => onDeleteGroupPermanently(group.id, group.owner!)
        );
    };

    const handleArchiveWorker = (worker: Worker) => {
        requestConfirmation(
            "Marquer comme Parti",
            "Êtes-vous sûr de vouloir marquer cet ouvrier comme parti ? Ses données seront archivées dans le groupe 'Personnel Parti'.",
            () => onArchiveWorker(worker.id)
        );
    };

    const handlePermanentDelete = (worker: Worker) => {
        requestConfirmation(
            "Suppression Définitive",
            <div className="space-y-2">
                <p>Êtes-vous absolument sûr de vouloir supprimer définitivement l'ouvrier <strong>{worker.name}</strong> ?</p>
                <p className="font-bold text-red-600">Cette action est irréversible et supprimera également toutes ses saisies et son historique.</p>
            </div>,
            () => onDeleteWorker(worker.id)
        );
    };

    const ActionButton: React.FC<{onClick: (e: React.MouseEvent<HTMLButtonElement>) => void, title: string, children: React.ReactNode, className?: string}> = 
    ({onClick, title, children, className}) => (
        <button onClick={onClick} title={title} className={`p-1.5 rounded-full transition-colors duration-200 ${className}`} onMouseEnter={playHoverSound}>
            {children}
        </button>
    );

    const sortedGroups = workerGroups
        .filter(group => group && (!group.isArchived || group.isDepartedGroup))
        .sort((a, b) => {
            if (a.isDepartedGroup) return 1;
            if (b.isDepartedGroup) return -1;
            return a.groupName.localeCompare(b.groupName);
        });

    return (
        <div className="space-y-8">
            <div className="flex justify-end items-center">
                <button 
                    onClick={(e) => { createRipple(e); openGroupModal(); }} 
                    className="flex items-center gap-2 px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sonacos-green transition-all duration-200" onMouseEnter={playHoverSound}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                    <span>Ajouter un Groupe</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {sortedGroups.map(group => {
                    const workersInGroup = Array.isArray(group.workers) ? group.workers : [];
                    return (
                    <GroupCard group={group} key={`${group.id}-${group.owner}`}>
                         <div className={`p-4 border-b border-slate-200 flex justify-between items-center rounded-t-lg ${group.isDepartedGroup ? 'bg-slate-200' : 'bg-slate-50'}`}>
                            <div>
                                <h3 className={`text-xl font-bold ${group.isDepartedGroup ? 'text-slate-600' : 'text-sonacos-green'}`}>{group.groupName}</h3>
                                {currentUser.role === 'superadmin' && group.ownerEmail && (
                                    <p className={`text-xs mt-1 ${group.ownerEmail === 'Inconnu' ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                        {group.ownerEmail === 'Inconnu' ? 'Propriétaire Inconnu' : group.ownerEmail}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {currentUser.role === 'superadmin' && group.ownerEmail === 'Inconnu' ? (
                                    <ActionButton 
                                        onClick={(e) => { createRipple(e); handlePermanentDeleteGroup(group); }} 
                                        title="Supprimer le groupe définitivement" 
                                        className="text-red-600 bg-red-100 hover:bg-red-200"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                    </ActionButton>
                                ) : !group.isDepartedGroup ? (
                                    <>
                                        <ActionButton onClick={(e) => { createRipple(e); openWorkerModal(group.id, group.owner!); }} title="Ajouter un ouvrier" className="text-green-700 bg-green-100 hover:bg-green-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                                        </ActionButton>
                                        <ActionButton onClick={(e) => { createRipple(e); openGroupModal(group); }} title="Modifier le groupe" className="text-blue-600 bg-blue-100 hover:bg-blue-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                        </ActionButton>
                                        <ActionButton onClick={(e) => { createRipple(e); handleArchiveGroup(group); }} title="Archiver le groupe" className="text-red-600 bg-red-100 hover:bg-red-200">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </ActionButton>
                                    </>
                                ) : null}
                            </div>
                        </div>

                         <div className="overflow-x-auto">
                            {workersInGroup.filter(w => w && (group.isDepartedGroup ? true : !w.isArchived)).length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-100 text-slate-600">
                                        <tr>
                                            <th className="text-left p-3 font-semibold">Nom</th>
                                            <th className="text-left p-3 font-semibold">Matricule</th>
                                            <th className="text-right p-3 font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {workersInGroup.filter(w => w && (group.isDepartedGroup ? true : !w.isArchived)).map((worker, index) => (
                                            <tr key={worker.id} className="odd:bg-white even:bg-stone-50 hover:bg-green-50/50" onMouseEnter={playHoverSound}>
                                                <td className="p-3 align-top">
                                                    <p className="font-medium text-slate-800">{worker.name}</p>
                                                    <p className="text-xs text-slate-500">{worker.departement}</p>
                                                    <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                                                        <p>RIB: {worker.rib || 'N/A'}</p>
                                                        <p>CNSS: {worker.cnss || 'N/A'}</p>
                                                        {worker.bankCode && <p>CHEZ: {worker.bankCode}</p>}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-slate-600 font-mono align-top">
                                                    <div>{worker.matricule}</div>
                                                    <div className="text-xs text-slate-400 mt-1">Ancienneté: {worker.seniorityPercentage ?? 0}%</div>
                                                    <div className="text-xs text-slate-400 mt-1">Enfants: {worker.numberOfChildren ?? 0}</div>
                                                </td>
                                                <td className="p-3 text-right align-top">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <ActionButton onClick={(e) => { createRipple(e); openWorkerModal(group.id, group.owner!, worker); }} title="Modifier l'ouvrier" className="text-slate-500 hover:bg-blue-100 hover:text-blue-600">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                                        </ActionButton>
                                                        {group.isDepartedGroup ? (
                                                            <ActionButton onClick={(e) => { createRipple(e); openMoveWorkerModal(worker); }} title="Réintégrer/Déplacer" className="text-slate-500 hover:bg-green-100 hover:text-green-600">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" /><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" /></svg>
                                                            </ActionButton>
                                                        ) : (
                                                            <>
                                                                <ActionButton onClick={(e) => { createRipple(e); openMoveWorkerModal(worker); }} title="Déplacer l'ouvrier" className="text-slate-500 hover:bg-purple-100 hover:text-purple-600">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 3z" clipRule="evenodd" transform="rotate(90 10 10)" /></svg>
                                                                </ActionButton>
                                                                <ActionButton onClick={(e) => { createRipple(e); handleArchiveWorker(worker); }} title="Marquer comme parti" className="text-slate-500 hover:bg-yellow-100 hover:text-yellow-600">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
                                                                </ActionButton>
                                                                 <ActionButton onClick={(e) => { createRipple(e); handlePermanentDelete(worker); }} title="Supprimer définitivement" className="text-slate-500 hover:bg-red-100 hover:text-red-600">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                                                </ActionButton>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-sm text-slate-400 text-center p-8">Aucun ouvrier dans ce groupe.</p>
                            )}
                        </div>
                    </GroupCard>
                )})}
            </div>

            <Modal isOpen={isGroupModalOpen} onClose={closeGroupModal} title={editingGroup ? "Modifier le Groupe" : "Nouveau Groupe"}>
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="group-name" className="block text-sm font-medium text-slate-700">Nom du groupe</label>
                        <input 
                            type="text" 
                            id="group-name" 
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={(e) => { createRipple(e); closeGroupModal(); }} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="submit" onClick={createRipple} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">{editingGroup ? 'Enregistrer' : 'Créer'}</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isWorkerModalOpen} onClose={closeWorkerModal} title={editingWorker ? "Modifier l'Ouvrier" : "Nouvel Ouvrier"}>
                <form onSubmit={handleWorkerSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="worker-name" className="block text-sm font-medium text-slate-700">Nom complet</label>
                        <input type="text" id="worker-name" value={workerName} onChange={e => setWorkerName(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                     <div>
                        <label htmlFor="worker-matricule" className="block text-sm font-medium text-slate-700">Matricule</label>
                        <input type="text" id="worker-matricule" value={workerMatricule} onChange={e => setWorkerMatricule(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                     <div>
                        <label htmlFor="worker-departement" className="block text-sm font-medium text-slate-700">Département</label>
                        <input type="text" id="worker-departement" value={workerDepartement} onChange={e => setWorkerDepartement(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                     <div>
                        <label htmlFor="worker-rib" className="block text-sm font-medium text-slate-700">N° de compte bancaire (RIB)</label>
                        <input type="text" id="worker-rib" value={workerRib} onChange={e => setWorkerRib(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                     <div>
                        <label htmlFor="worker-cnss" className="block text-sm font-medium text-slate-700">N° CNSS</label>
                        <input type="text" id="worker-cnss" value={workerCnss} onChange={e => setWorkerCnss(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                     <div>
                        <label htmlFor="worker-bank-code" className="block text-sm font-medium text-slate-700">Code Banque (CHEZ)</label>
                        <input type="text" id="worker-bank-code" value={workerBankCode} onChange={e => setWorkerBankCode(e.target.value)} placeholder="Ex: CAM, BCP" className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                     <div>
                        <label htmlFor="worker-seniority" className="block text-sm font-medium text-slate-700">Pourcentage d'ancienneté (%)</label>
                        <input type="number" id="worker-seniority" value={workerSeniority} onChange={e => setWorkerSeniority(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="any" placeholder="0" required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                    <div>
                        <label htmlFor="worker-children" className="block text-sm font-medium text-slate-700">Nombre d'enfants</label>
                        <input type="number" id="worker-children" value={workerChildren} onChange={e => setWorkerChildren(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="1" placeholder="0" required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={(e) => { createRipple(e); closeWorkerModal(); }} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="submit" onClick={createRipple} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">{editingWorker ? 'Enregistrer' : 'Créer'}</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isMoveModalOpen} onClose={closeMoveWorkerModal} title={`Déplacer ${movingWorker?.name || 'l\'ouvrier'}`}>
                <form onSubmit={handleMoveSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="target-group" className="block text-sm font-medium text-slate-700">Nouveau groupe de destination</label>
                        <select 
                            id="target-group" 
                            value={targetGroupId}
                            onChange={(e) => setTargetGroupId(e.target.value ? Number(e.target.value) : '')}
                            required
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green"
                        >
                            <option value="" disabled>Choisir un groupe...</option>
                            {workerGroups
                                .filter(g => movingWorker && g.id !== findWorkerGroup(movingWorker.id)?.id)
                                .map(g => (
                                    <option key={g.id} value={g.id}>{g.groupName} {currentUser.role === 'superadmin' ? `(${g.ownerEmail})` : ''}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={(e) => { createRipple(e); closeMoveWorkerModal(); }} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="submit" onClick={createRipple} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">Déplacer</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default ManagementView;