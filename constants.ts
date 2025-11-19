import { Task, TaskGroup } from './types';

export const INITIAL_TASK_GROUPS: TaskGroup[] = [
  {
    category: 'Réception',
    tasks: [
      { id: 1, description: 'Bettrave, tournesol, luzerne, mais (10 kg)', unit: 'par quintal', price: 1.20 },
      { id: 71, description: 'RÉCEPTION BRUT - Céréales, mais, tournesol, l\'orge, luzerne, Légumineuse (100 kg)', unit: 'par quintal', price: 1.05 },
      { id: 72, description: 'RÉCEPTION TRANFERTS HORS ZONE - Céréales, mais, tournesol, l\'orge, luzerne, Légumineuse (100 kg)', unit: 'par quintal', price: 1.05 },
      { id: 73, description: 'RÉCEPTION BIG BAG - Céréales, mais, tournesol, l\'orge, luzerne, Légumineuse (100 kg)', unit: 'par quintal', price: 1.05 },
      { id: 3, description: 'Céréales, mais, tournesol, l\'orge, luzerne, Légumineuse, riz (50 kg)', unit: 'par quintal', price: 1.35 },
      { id: 4, description: 'Céréales en vrac', unit: 'par quintal', price: 0.80 },
      { id: 5, description: 'Mais, tournesol, orge, luzerne, Légumineuse, riz (25 à 40 kg)', unit: 'par quintal', price: 1.50 },
      { id: 6, description: 'Avoine et tournesol (plus de 70 kg)', unit: 'par quintal', price: 1.15 },
      { id: 7, description: 'Avoine et tournesol (moins de 70 kg)', unit: 'par quintal', price: 1.45 },
      { id: 8, description: 'Engrais', unit: 'par quintal', price: 1.10 },
      { id: 9, description: 'Pomme de Terre', unit: 'par quintal', price: 1.60 },
    ],
  },
  {
    category: 'Conditionnement',
    tasks: [
      { id: 48, description: 'Céréales et autres', unit: 'par quintal', price: 1.25 },
      { id: 49, description: 'Avoine et tournesol', unit: 'par quintal', price: 1.55 },
    ],
  },
  {
    category: 'Reconditionnement',
    tasks: [
      { id: 50, description: 'Céréales et autres', unit: 'par quintal', price: 1.25 },
      { id: 51, description: 'Avoine et tournesol', unit: 'par quintal', price: 1.55 },
    ],
  },
  {
    category: 'Débardage',
    tasks: [
      { id: 12, description: 'Céréales et autres (100 kg)', unit: 'par quintal', price: 1.65 },
      { id: 13, description: 'Céréales et autres (50 kg)', unit: 'par quintal', price: 1.10 },
      { id: 14, description: 'Avoine et tournesol', unit: 'par quintal', price: 1.85 },
    ],
  },
  {
    category: 'Mise en pile après conditionnement',
    tasks: [
      { id: 52, description: 'Céréales et autres (100 kg)', unit: 'par quintal', price: 1.05 },
      { id: 53, description: 'Céréales et autres (100 kg) / Tracteur ou chariot', unit: 'par quintal', price: 0.85 },
      { id: 54, description: 'Céréales et autres (50 kg)', unit: 'par quintal', price: 1.35 },
      { id: 55, description: 'Céréales et autres (50 kg) / Tracteur ou chariot', unit: 'par quintal', price: 0.95 },
      { id: 56, description: 'Avoines et tournesol', unit: 'par quintal', price: 1.55 },
    ],
  },
    {
    category: 'Mise en pile après reconditionnement',
    tasks: [
      { id: 57, description: 'Céréales et autres (100 kg)', unit: 'par quintal', price: 1.05 },
      { id: 58, description: 'Céréales et autres (100 kg) / Tracteur ou chariot', unit: 'par quintal', price: 0.85 },
      { id: 59, description: 'Céréales et autres (50 kg)', unit: 'par quintal', price: 1.35 },
      { id: 60, description: 'Céréales et autres (50 kg) / Tracteur ou chariot', unit: 'par quintal', price: 0.95 },
      { id: 61, description: 'Avoines et tournesol', unit: 'par quintal', price: 1.55 },
    ],
  },
  {
    category: 'Traitement',
    tasks: [
      { id: 20, description: 'Céréales et autres', unit: 'par quintal', price: 1.65 },
      { id: 21, description: 'Avoine et tournesol', unit: 'par quintal', price: 1.95 },
    ],
  },
  {
    category: 'Mise en pile après traitement',
    tasks: [
      { id: 22, description: 'Céréales et autres (50 kg)', unit: 'par quintal', price: 1.10 },
      { id: 23, description: 'Céréales et autres (50 kg) / Tracteur ou chariot', unit: 'par quintal', price: 0.90 },
      { id: 24, description: 'Avoine et tournesol', unit: 'par quintal', price: 1.40 },
    ],
  },
  {
    category: 'Livraison',
    tasks: [
      { id: 25, description: 'Bettrave, tournesol, luzerne, mais (10 kg)', unit: 'par quintal', price: 1.20 },
      { id: 26, description: 'Céréales, mais, l\'orge, luzerne, légumineuse(100 kg)', unit: 'par quintal', price: 1.10 },
      { id: 62, description: 'APPROVISIONEMENT - Céréales, mais, l\'orge, luzerne, légumineuse, riz(50 kg)', unit: 'par quintal', price: 1.35 },
      { id: 63, description: 'VENTE AU CENTRE - Céréales, mais, l\'orge, luzerne, légumineuse, riz(50 kg)', unit: 'par quintal', price: 1.35 },
      { id: 64, description: 'TRANSFERT HORS ZONE - Céréales, mais, l\'orge, luzerne, légumineuse, riz(50 kg)', unit: 'par quintal', price: 1.35 },
      { id: 68, description: 'APPROVISIONEMENT - Mais, orge, luzerne, légumineuse, riz(25 à 40 kg)', unit: 'par quintal', price: 1.50 },
      { id: 69, description: 'VENTE AU CENTRE - Mais, orge, luzerne, légumineuse, riz(25 à 40 kg)', unit: 'par quintal', price: 1.50 },
      { id: 70, description: 'TRANSFERT HORS ZONE - Mais, orge, luzerne, légumineuse, riz(25 à 40 kg)', unit: 'par quintal', price: 1.50 },
      { id: 29, description: 'Avoine et tournesol (plus de 70 kg)', unit: 'par quintal', price: 1.25 },
      { id: 30, description: 'Avoine et tournesol (moins de 70 kg)', unit: 'par quintal', price: 1.60 },
      { id: 31, description: 'Pomme de Terre 50 kg', unit: 'par quintal', price: 1.70 },
      { id: 65, description: 'APPROVISIONEMENT - Engrais', unit: 'par quintal', price: 1.10 },
      { id: 66, description: 'VENTE AU CENTRE - Engrais', unit: 'par quintal', price: 1.10 },
      { id: 67, description: 'TRANSFERT HORS ZONE - Engrais', unit: 'par quintal', price: 1.10 },
    ],
  },
    {
    category: 'Opérations Diverses',
    tasks: [
      { id: 33, description: 'Identification des semences et Réglage du poids', unit: 'par quintal', price: 1.88 },
      { id: 34, description: 'Concassement des engrais en cas de prise en masse', unit: 'par quintal', price: 1.70 },
      { id: 35, description: 'Mise en pile après concassement - Engrais (50 kg)', unit: 'par quintal', price: 1.05 },
      { id: 36, description: 'Mise en pile après ré-étiquetage - Céréales (50 kg)', unit: 'par quintal', price: 1.15 },
      { id: 37, description: 'Indemnité de lait pendant les opérations de conditionnement, traitement et fumigation', unit: 'par jour', price: 7.00 },
      { id: 38, description: 'Fumigation et bachage après fumigation', unit: 'par quintal', price: 0.25 },
      { id: 39, description: 'bâchage', unit: 'par bâche', price: 50.00 },
      { id: 40, description: 'débachage et mise en ordre des bâches', unit: 'par bâche', price: 50.00 },
      { id: 41, description: 'Réception et Livraison sacherie', unit: 'par Pochette de 250 sacs', price: 5.00 },
      { id: 42, description: 'la mise en pochette de (25 à 50 sac) de la sacherie 100 kg', unit: 'par sac 100kg', price: 0.30 },
      { id: 43, description: 'Impression étiquettes (interne et externe du sac)', unit: 'par étiquette', price: 0.05 },
      { id: 44, description: 'Réception et livraison Produits de traitement', unit: 'par Unité (bidon)', price: 0.15 },
      { id: 45, description: 'Réception et livraison des bâches neufs', unit: 'par bâche', price: 15.00 },
      { id: 46, description: 'Nettoyage de machine après conditionnement (en cas d\'absence de chef d\'équipe )', unit: 'forfait', price: 150.00 },
      { id: 47, description: 'Indemnité de panier (travail continu de 8 heures)', unit: 'par jour', price: 10.00 },
    ],
  },
];

/**
 * Retrieves a task by its ID from a dynamic map, providing a fallback placeholder for outdated/unknown IDs.
 * @param taskId The ID of the task to retrieve.
 * @param taskMap The dynamic map of tasks.
 */
export const getDynamicTaskByIdWithFallback = (taskId: number, taskMap: Map<number, Task & { category: string }>): Task & { category: string } => {
    return taskMap.get(taskId) || {
        id: taskId,
        description: `Tâche obsolète (ID: ${taskId})`,
        category: 'À METTRE À JOUR',
        unit: 'N/A',
        price: 0,
    };
};
