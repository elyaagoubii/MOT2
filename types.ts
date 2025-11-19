

export interface Task {
  id: number;
  description: string;
  unit: string;
  price: number;
}

export interface TaskGroup {
  category: string;
  tasks: Task[];
}

export interface Worker {
  id: number;
  name: string;
  matricule: string;
  departement: string;
  rib: string;
  cnss: string;
  bankCode?: string;
  seniorityPercentage: number;
  numberOfChildren: number;
  isArchived?: boolean;
}

export interface WorkerGroup {
  id: number;
  groupName: string;
  workers: Worker[];
  isArchived?: boolean;
  isDepartedGroup?: boolean;
  owner?: string; // UID of the user who owns this group
  ownerEmail?: string; // Email of the user for display
}

export interface DailyLog {
    id: string; // Firestore ID
    date: string; // YYYY-MM-DD
    workerId: number;
    taskId: number;
    quantity: number;
    observation: string;
    owner?: string; // UID of the user who owns this log
}

export interface WorkedDays {
  id?: string; // Firestore ID
  workerId: number;
  year: number;
  month: number; // 1-12
  period: 'first' | 'second'; // 1-15 or 16-end
  days: number;
  owner?: string; // UID of the user who owns this entry
}

export type UserRole = 'superadmin' | 'user';

export interface User {
  uid: string; // Firebase Auth UID
  email: string;
  role: UserRole;
}

// --- Data Payloads for Saved Reports ---

export interface FinalReportData {
  workers: Worker[];
  logs: DailyLog[];
  allWorkedDays: WorkedDays[];
  startDate: string;
  endDate: string;
}

export interface PayrollData {
    worker: Worker;
    tasks: {
        taskId: number;
        quantity: number;
        price: number;
        amount: number;
    }[];
    totalOperation: number;
    anciennete: number;
    totalBrut: number;
    retenu: number;
    joursTravailles: number;
    jourFerier: number;
}

export interface TransferOrderData {
    worker: Worker;
    netPay: number;
}

export interface AnnualSummaryData {
    worker: Worker;
    totalOperation: number;
    anciennete: number;
    totalBrut: number;
    retenu: number;
    joursTravailles: number;
    indemnites: number;
    netPay: number;
    // FIX: Make groupName and isHNS required to match component logic and resolve type predicate error.
    groupName: string;
    isHNS: boolean;
}

export interface DetailedPayrollData {
    worker: Worker;
    montant: number;
    anciennete: number;
    total: number;
    indemLait: number;
    primePanier: number;
    retCnss: number;
    retAmo: number;
    avanceAid: number;
    ir: number;
    netAPayer: number;
    joursTravailles: number;
    congePaye: number;
    jourFerier: number;
}

// --- Saved Report Firestore Document Structures ---

export interface SavedReport {
    id: string;
    owner: string;
    createdAt: string;
    updatedAt: string;
}

export interface SavedFinalReport extends SavedReport {
  params: {
    year: number;
    month: number;
    period: 'first' | 'second';
    regionalCenter: string;
    workerIds: number[];
  };
  data: FinalReportData;
}

export interface SavedPayroll extends SavedReport {
    params: {
        // FIX: Replaced sourceReportIds with properties that are actually used in the component logic.
        startDate: string;
        endDate: string;
        workerIds: number[];
        anneeScolaire: string;
        anneeRegle: string;
        centreRegional: string;
        additionalInputs: Record<number, { avance: string; jourFerier?: string; }>;
    };
    data: PayrollData[];
}

export interface SavedTransferOrder extends SavedReport {
    params: {
        // FIX: Replaced sourceReportIds with properties that are actually used in the component logic.
        startDate: string;
        endDate: string;
        workerIds: number[];
        city: string;
        orderDate: string;
    };
    data: TransferOrderData[];
}

export interface SavedAnnualSummary extends SavedReport {
    params: {
        sourceReportIds: string[];
        year: number;
    };
    data: AnnualSummaryData[];
}

export interface SavedDetailedPayroll extends SavedReport {
    params: {
        year: number;
        month: number;
        period: 'first' | 'second';
        regionalCenter: string;
        workerIds: number[];
        additionalInputs: Record<number, { avanceAid: string; ir: string }>;
    };
    data: DetailedPayrollData[];
}