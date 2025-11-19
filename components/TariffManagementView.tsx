import React, { useState, FormEvent, useRef } from 'react';
import { Task, TaskGroup } from '../types';
import Modal from './Modal';
import { playHoverSound, playClickSound } from '../utils/audioUtils';
import { createRipple, useGlow } from '../utils/effects';

interface TariffManagementViewProps {
    taskGroups: TaskGroup[];
    onUpdateTask: (categoryName: string, taskId: number, newPrice: number) => void;
    onAddTask: (categoryName: string, taskData: Omit<Task, 'id'>) => void;
    requestConfirmation: (title: string, message: string | React.ReactNode, onConfirm: () => void) => void;
}

const TariffManagementView: React.FC<TariffManagementViewProps> = ({ taskGroups, onUpdateTask, onAddTask, requestConfirmation }) => {
    const [editedPrices, setEditedPrices] = useState<Record<number, string>>({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCategory, setCurrentCategory] = useState<string | null>(null);

    // Form states for new task
    const [newDescription, setNewDescription] = useState('');
    const [newUnit, setNewUnit] = useState('par quintal');
    const [newPrice, setNewPrice] = useState<number | ''>('');

    const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
    taskGroups.forEach((_, i) => {
        cardRefs.current[i] = React.createRef<HTMLDivElement>() as any;
    });

    const handlePriceChange = (taskId: number, value: string) => {
        setEditedPrices(prev => ({ ...prev, [taskId]: value }));
    };

    const handlePriceSave = (categoryName: string, task: Task) => {
        const editedPriceStr = editedPrices[task.id];
        if (editedPriceStr === undefined) return; // No change

        const newPrice = parseFloat(editedPriceStr);
        if (isNaN(newPrice) || newPrice < 0 || newPrice === task.price) {
            // If invalid or unchanged, revert to original price
            const { [task.id]: _, ...rest } = editedPrices;
            setEditedPrices(rest);
            return;
        }

        onUpdateTask(categoryName, task.id, newPrice);
        const { [task.id]: _, ...rest } = editedPrices; // Clear the edited state for this task
        setEditedPrices(rest);
    };
    
    const openAddTaskModal = (categoryName: string) => {
        playClickSound();
        setCurrentCategory(categoryName);
        setNewDescription('');
        setNewUnit('par quintal');
        setNewPrice('');
        setIsModalOpen(true);
    };

    const closeAddTaskModal = () => {
        setIsModalOpen(false);
        setCurrentCategory(null);
    };

    const handleAddTaskSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!currentCategory || !newDescription.trim() || newPrice === '') {
            alert("Veuillez remplir tous les champs.");
            return;
        }

        const taskData = {
            description: newDescription.trim(),
            unit: newUnit.trim(),
            price: Number(newPrice),
        };

        onAddTask(currentCategory, taskData);
        closeAddTaskModal();
    };


    return (
        <div className="space-y-8">
            <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                <h2 className="font-bold text-blue-800">Gestion des Tarifs</h2>
                <p className="text-sm text-blue-700 mt-1">
                    Modifiez les prix ou ajoutez de nouvelles opérations. Les changements sont sauvegardés automatiquement lorsque vous quittez un champ de prix et sont immédiatement appliqués à toute l'application.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {taskGroups.map((group, index) => (
                    <div ref={el => cardRefs.current[index] = el} key={group.category} className="bg-white rounded-lg shadow-lg border border-slate-200 flex flex-col" onMouseEnter={playHoverSound}>
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
                            <h3 className="text-xl font-bold text-sonacos-green">{group.category}</h3>
                            <button 
                                onClick={(e) => { createRipple(e); openAddTaskModal(group.category); }} 
                                title="Ajouter une tâche" 
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 bg-green-100 text-green-700 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                            >
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                <span>Ajouter</span>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                             <table className="w-full text-sm">
                                <thead className="bg-stone-100 text-slate-600">
                                    <tr>
                                        <th className="text-left p-3 font-semibold">Description</th>
                                        <th className="text-left p-3 font-semibold w-32">Unité</th>
                                        <th className="text-right p-3 font-semibold w-32">Prix (DH)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.tasks.map(task => (
                                        <tr key={task.id} className="odd:bg-white even:bg-stone-50 hover:bg-green-50/50">
                                            <td className="p-3 text-slate-800">{task.description}</td>
                                            <td className="p-3 text-slate-600">{task.unit}</td>
                                            <td className="p-1 text-right">
                                                <input
                                                    type="number"
                                                    value={editedPrices[task.id] ?? task.price}
                                                    onChange={(e) => handlePriceChange(task.id, e.target.value)}
                                                    onBlur={() => handlePriceSave(group.category, task)}
                                                    min="0"
                                                    step="0.01"
                                                    className="w-24 p-2 text-right border border-transparent hover:border-slate-300 focus:border-sonacos-green focus:ring-1 focus:ring-sonacos-green rounded-md shadow-sm transition-colors"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={closeAddTaskModal} title={`Ajouter une Tâche à "${currentCategory}"`}>
                <form onSubmit={handleAddTaskSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="task-desc" className="block text-sm font-medium text-slate-700">Description</label>
                        <input type="text" id="task-desc" value={newDescription} onChange={e => setNewDescription(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="task-unit" className="block text-sm font-medium text-slate-700">Unité</label>
                        <input type="text" id="task-unit" value={newUnit} onChange={e => setNewUnit(e.target.value)} required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                     <div>
                        <label htmlFor="task-price" className="block text-sm font-medium text-slate-700">Prix</label>
                        <input type="number" id="task-price" value={newPrice} onChange={e => setNewPrice(e.target.value === '' ? '' : Number(e.target.value))} min="0" step="any" required className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm" />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={(e) => { createRipple(e); closeAddTaskModal(); }} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="submit" onClick={createRipple} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">Ajouter la Tâche</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TariffManagementView;
