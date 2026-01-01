
export enum LoanType {
  BANK = 'Bank',
  INDIVIDUAL = 'Individual'
}

export interface Lender {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: LoanType;
  imageUrl?: string;
  proofUrl?: string;
  userId: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  loanId: string;
  lenderName?: string;
  amount: number;
  date: string;
  note?: string;
  userId: string;
}

export interface Loan {
  id: string;
  lenderId: string;
  lenderName: string; 
  date: string;
  dueDate?: string;
  type: LoanType;
  totalAmount: number;
  paidAmount: number;
  notes?: string;       // New field
  documentUrl?: string; // New field
  userId: string;
}

export interface AppState {
  lenders: Lender[];
  loans: Loan[];
}
