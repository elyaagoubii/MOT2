import React, { useState, FormEvent } from 'react';
import { User, UserRole } from '../types';
import Modal from './Modal';
import { playClickSound } from '../utils/audioUtils';
import { createRipple } from '../utils/effects';
import { app, db } from '../firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, inMemoryPersistence, createUserWithEmailAndPassword, signOut as signOutTemp } from 'firebase/auth';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

interface UserManagementViewProps {
    users: User[];
    onFetchUsers: () => void;
    currentUser: User;
    onDeleteUserOnly: (userId: string) => void;
    onDeleteUserAndData: (userId: string) => void;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ users, onFetchUsers, currentUser, onDeleteUserOnly, onDeleteUserAndData }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleteOption, setDeleteOption] = useState<'user' | 'data'>('user');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('user');

    const openModal = (user: User | null = null) => {
        playClickSound();
        setEditingUser(user);
        setEmail(user ? user.email : '');
        setRole(user ? user.role : 'user');
        setPassword('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingUser(null);
    };
    
    const openDeleteModal = (user: User) => {
        playClickSound();
        setUserToDelete(user);
        setDeleteOption('user');
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setDeleteModalOpen(false);
        setUserToDelete(null);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            alert("L'adresse e-mail est requise.");
            return;
        }

        if (editingUser) {
            const userDocRef = doc(db, 'users', editingUser.uid);
            await updateDoc(userDocRef, { role });
        } else {
            if (!password.trim()) {
                alert("Le mot de passe est requis pour un nouvel utilisateur.");
                return;
            }
            try {
                const tempAppName = 'secondary-user-creation-' + Date.now();
                const tempApp = initializeApp(app.options, tempAppName);
                
                // Get the Auth instance for the temporary app. This will register the component.
                const tempAuth = getAuth(tempApp);
                
                // Set persistence to in-memory to avoid conflicts with the main user's session.
                await setPersistence(tempAuth, inMemoryPersistence);

                const userCredential = await createUserWithEmailAndPassword(tempAuth, email.trim(), password.trim());
                const newUser = userCredential.user;
                if (newUser) {
                    await setDoc(doc(db, 'users', newUser.uid), { email: newUser.email, role: role });
                    await signOutTemp(tempAuth);
                }
            } catch (error: any) {
                alert(error.code === 'auth/email-already-in-use' ? 'Cette adresse e-mail est déjà utilisée.' : 'Erreur lors de la création de l\'utilisateur.');
                return;
            }
        }
        onFetchUsers();
        closeModal();
    };
    
    const handleConfirmDelete = () => {
        if (!userToDelete) return;
        if (deleteOption === 'user') {
            onDeleteUserOnly(userToDelete.uid);
        } else {
            onDeleteUserAndData(userToDelete.uid);
        }
        closeDeleteModal();
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
             <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800">Gestion des Utilisateurs</h2>
                <button
                    onClick={(e) => { createRipple(e); openModal(); }}
                    className="flex items-center gap-2 px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sonacos-green"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    <span>Ajouter un utilisateur</span>
                </button>
            </div>
            
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                        <tr>
                            <th className="text-left p-3 font-semibold">Adresse e-mail</th>
                            <th className="text-left p-3 font-semibold">Rôle</th>
                            <th className="text-right p-3 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.uid} className="odd:bg-white even:bg-slate-50 border-t">
                                <td className="p-3 font-medium text-slate-800">{user.email} {user.uid === currentUser.uid && '(Vous)'}</td>
                                <td className="p-3">
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${user.role === 'superadmin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {user.role === 'superadmin' ? 'Admin Général' : 'Utilisateur'}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                     <button onClick={() => openModal(user)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                    </button>
                                    {user.uid !== currentUser.uid && (
                                        <button onClick={() => openDeleteModal(user)} title="Supprimer l'utilisateur" className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors ml-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingUser ? "Modifier le Rôle de l'Utilisateur" : "Nouvel Utilisateur"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="user-email" className="block text-sm font-medium text-slate-700">Adresse e-mail</label>
                        <input type="email" id="user-email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingUser} className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green disabled:bg-slate-100" />
                    </div>
                     {!editingUser && (
                        <div>
                            <label htmlFor="user-password" className="block text-sm font-medium text-slate-700">Mot de passe</label>
                            <input type="password" id="user-password" value={password} onChange={e => setPassword(e.target.value)} required={!editingUser} className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green" />
                        </div>
                     )}
                     <div>
                        <label htmlFor="user-role" className="block text-sm font-medium text-slate-700">Rôle</label>
                        <select id="user-role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green">
                            <option value="user">Utilisateur</option>
                            <option value="superadmin">Admin Général</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={closeModal} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="submit" className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">{editingUser ? 'Enregistrer' : 'Créer'}</button>
                    </div>
                </form>
            </Modal>
            
            <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title={`Supprimer l'utilisateur ${userToDelete?.email}`}>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Veuillez choisir une option de suppression. Cette action est irréversible.
                    </p>
                    
                    <fieldset className="space-y-3">
                        <legend className="sr-only">Options de suppression</legend>
                        <div 
                            onClick={() => setDeleteOption('user')}
                            className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${deleteOption === 'user' ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'border-slate-300'}`}
                        >
                            <div className="flex items-center h-5">
                                <input id="delete-user-only" name="delete-option" type="radio" checked={deleteOption === 'user'} onChange={() => {}} className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300" />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="delete-user-only" className="font-medium text-slate-900">Supprimer l'utilisateur uniquement</label>
                                <p className="text-slate-500">
                                    Les données de l'utilisateur (saisies, groupes, etc.) seront conservées mais ne seront plus associées à un utilisateur actif. L'administrateur pourra toujours voir ces données.
                                </p>
                            </div>
                        </div>

                        <div 
                            onClick={() => setDeleteOption('data')}
                            className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${deleteOption === 'data' ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'border-slate-300'}`}
                        >
                            <div className="flex items-center h-5">
                                <input id="delete-user-data" name="delete-option" type="radio" checked={deleteOption === 'data'} onChange={() => {}} className="focus:ring-red-500 h-4 w-4 text-red-600 border-gray-300" />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="delete-user-data" className="font-medium text-slate-900">Supprimer l'utilisateur ET toutes ses données</label>
                                <p className="font-bold text-red-600">
                                    Attention: Toutes les saisies, les groupes d'ouvriers, et les jours de travail créés par cet utilisateur seront définitivement supprimés.
                                </p>
                            </div>
                        </div>
                    </fieldset>

                    <div className="text-xs text-slate-500 pt-2 border-t mt-4">
                        <strong>Note :</strong> La suppression ne supprime que les données de cette application. Le compte de connexion (Firebase Auth) de l'utilisateur ne sera pas supprimé et devra être géré manuellement dans la console Firebase pour des raisons de sécurité.
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={(e) => { createRipple(e); closeDeleteModal(); }} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="button" onClick={(e) => { createRipple(e); handleConfirmDelete(); }} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700">Confirmer la Suppression</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default UserManagementView;