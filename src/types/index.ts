export type PlanType = 'daily' | 'monthly' | 'annual';

export type StudentStatus = 'active' | 'inactive' | 'overdue';

export type UserRole = 'professor' | 'student';

export interface User {
    id: string;
    username: string;
    password: string;
    role: UserRole;
    associatedId: string; // ID of the professor or student record
}

export interface Payment {
    id: string;
    studentId: string;
    date: string;
    amount: number;
    type: PlanType;
    status: 'paid' | 'pending' | 'overdue';
}

export interface Attendance {
    id: string;
    studentId: string;
    date: string;
    present: boolean;
}

export interface Student {
    id: string;
    username: string;
    name: string;
    email: string;
    phone: string;
    birthDate: string; // Date of birth
    height: number; // in cm
    weight: number; // in kg
    goal: string; // Training objective
    joinDate: string;
    planType: PlanType;
    athleteType: 'athlete' | 'functional';
    paymentDay: number; // Day of the month
    active: boolean;
    lastPaymentDate?: string;
}

export interface Professor {
    id: string;
    username: string;
    name: string;
    email: string;
}
