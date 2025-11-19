import React, { useState, FormEvent } from 'react';
import { createRipple } from '../utils/effects';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail, createUserWithEmailAndPassword } from "firebase/auth";
import Modal from './Modal';

const LoginView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    
    // State for password reset modal
    const [isResetModalOpen, setResetModalOpen] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');

    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setResetSuccess('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            switch (err.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    setError("Adresse e-mail ou mot de passe incorrect.");
                    break;
                case 'auth/invalid-email':
                    setError("L'adresse e-mail n'est pas valide.");
                    break;
                default:
                    setError("Une erreur est survenue. Veuillez réessayer.");
                    break;
            }
        }
    };
    
    const handleSignUpSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // The onAuthStateChanged listener in App.tsx will handle the rest
        } catch (err: any) {
             switch (err.code) {
                case 'auth/email-already-in-use':
                    setError("Cette adresse e-mail est déjà utilisée.");
                    break;
                case 'auth/weak-password':
                    setError("Le mot de passe doit contenir au moins 6 caractères.");
                    break;
                 case 'auth/invalid-email':
                    setError("L'adresse e-mail n'est pas valide.");
                    break;
                default:
                    setError("Erreur lors de la création du compte.");
                    break;
            }
        }
    };

    const handlePasswordReset = async (e: FormEvent) => {
        e.preventDefault();
        setResetError('');
        setResetSuccess('');
        if (!resetEmail) {
            setResetError("Veuillez entrer votre adresse e-mail.");
            return;
        }
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetSuccess("Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé. Veuillez vérifier votre boîte de réception.");
            setResetModalOpen(false);
            setResetEmail('');
        } catch (err: any) {
            console.error("Password reset error:", err);
            setResetError("Impossible d'envoyer l'e-mail. Vérifiez l'adresse et réessayez.");
        }
    };
    
    const openResetModal = () => {
        setResetModalOpen(true);
        setError('');
        setResetSuccess('');
        setResetError('');
    }
    
    const toggleForm = (isSigningUp: boolean) => {
        setIsSignUp(isSigningUp);
        setError('');
        setResetSuccess('');
        // Do not clear email/password to allow seamless switching
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex items-center justify-center mb-8">
                    <h1 className="text-4xl font-montserrat font-extrabold tracking-tight bg-gradient-to-r from-red-600 to-green-600 bg-clip-text text-transparent">
                        SONACOS
                    </h1>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <h2 className="text-2xl font-bold text-center text-slate-800 mb-1">
                        {isSignUp ? 'Créer un Compte' : 'Connexion'}
                    </h2>
                    <p className="text-center text-slate-500 mb-6 text-sm">
                         {isSignUp ? 'Remplissez les informations ci-dessous.' : 'Veuillez entrer vos identifiants pour continuer.'}
                    </p>
                    
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}
                    
                    {resetSuccess && !isSignUp && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-4 text-sm" role="alert">
                            <span className="block sm:inline">{resetSuccess}</span>
                        </div>
                    )}


                    <form onSubmit={isSignUp ? handleSignUpSubmit : handleLoginSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                                Adresse e-mail
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setError(''); setResetSuccess(''); }}
                                className="w-full p-3 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green"
                            />
                        </div>

                        <div>
                             <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="password"  className="block text-sm font-medium text-slate-700">
                                    Mot de passe
                                </label>
                                {!isSignUp && (
                                    <button type="button" onClick={openResetModal} className="text-xs font-medium text-sonacos-green hover:underline focus:outline-none">
                                        Mot de passe oublié ?
                                    </button>
                                )}
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete={isSignUp ? "new-password" : "current-password"}
                                required
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); setError(''); setResetSuccess(''); }}
                                className="w-full p-3 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green"
                            />
                        </div>
                        
                         {isSignUp && (
                            <div>
                                <label htmlFor="confirm-password"  className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Confirmer le mot de passe
                                </label>
                                <input
                                    id="confirm-password"
                                    name="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                                    className="w-full p-3 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green"
                                />
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                onClick={createRipple}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sonacos-green hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sonacos-green transition-colors"
                            >
                                {isSignUp ? "S'inscrire" : "Se connecter"}
                            </button>
                        </div>
                    </form>
                    
                    <div className="text-center mt-6">
                        <button onClick={() => toggleForm(!isSignUp)} className="text-sm font-medium text-sonacos-green hover:underline">
                            {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
                        </button>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={isResetModalOpen} onClose={() => setResetModalOpen(false)} title="Réinitialiser le mot de passe">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                     <p className="text-sm text-slate-600">
                        Entrez l'adresse e-mail associée à votre compte et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                    </p>
                    {resetError && (
                         <div className="bg-red-100 text-red-700 px-3 py-2 rounded-md text-sm">
                            {resetError}
                        </div>
                    )}
                    <div>
                        <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">Adresse e-mail</label>
                        <input 
                            type="email" 
                            id="reset-email" 
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            className="mt-1 w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-sonacos-green focus:border-sonacos-green"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => { createRipple; setResetModalOpen(false); }} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300">Annuler</button>
                        <button type="submit" onClick={createRipple} className="px-4 py-2 bg-sonacos-green text-white font-semibold rounded-lg hover:bg-green-800">Envoyer le lien</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LoginView;