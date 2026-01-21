import React, { createContext, useContext, useState } from 'react';
import type { Student, Attendance, Payment, User, Professor } from '../types';
import { addDays, isAfter, parseISO } from 'date-fns';

interface BoxingContextType {
    students: Student[];
    professors: Professor[];
    users: User[];
    attendance: Attendance[];
    payments: Payment[];
    addStudent: (student: Omit<Student, 'id'>) => void;
    updateStudent: (id: string, student: Partial<Student>) => void;
    deleteStudent: (id: string) => void;
    markAttendance: (studentId: string, present: boolean) => void;
    getStudentStatus: (student: Student) => 'active' | 'overdue';
    currentUser: { role: 'professor' | 'student'; id: string; username: string } | null;
    login: (username: string, password: string) => boolean;
    logout: () => void;
    registerStudent: (studentData: Omit<Student, 'id' | 'active' | 'joinDate'>, password: string) => boolean;
    registerProfessor: (professorData: Omit<Professor, 'id'>, password: string) => boolean;
}

const BoxingContext = createContext<BoxingContextType | undefined>(undefined);

export const BoxingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [payments, _setPayments] = useState<Payment[]>([]);
    const [currentUser, setCurrentUser] = useState<{ role: 'professor' | 'student'; id: string; username: string } | null>(null);

    const registerStudent = (studentData: Omit<Student, 'id' | 'active' | 'joinDate'>, password: string): boolean => {
        // Check if username already exists
        if (users.find(u => u.username === studentData.username)) {
            return false;
        }

        const studentId = Math.random().toString(36).substr(2, 9);
        const userId = Math.random().toString(36).substr(2, 9);

        const newStudent: Student = {
            ...studentData,
            id: studentId,
            active: true,
            joinDate: new Date().toISOString().split('T')[0],
            lastPaymentDate: new Date().toISOString().split('T')[0],
        };

        const newUser: User = {
            id: userId,
            username: studentData.username,
            password, // In production, this should be hashed
            role: 'student',
            associatedId: studentId,
        };

        setStudents([...students, newStudent]);
        setUsers([...users, newUser]);
        return true;
    };

    const registerProfessor = (professorData: Omit<Professor, 'id'>, password: string): boolean => {
        // Check if username already exists
        if (users.find(u => u.username === professorData.username)) {
            return false;
        }

        const professorId = Math.random().toString(36).substr(2, 9);
        const userId = Math.random().toString(36).substr(2, 9);

        const newProfessor: Professor = {
            ...professorData,
            id: professorId,
        };

        const newUser: User = {
            id: userId,
            username: professorData.username,
            password, // In production, this should be hashed
            role: 'professor',
            associatedId: professorId,
        };

        setProfessors([...professors, newProfessor]);
        setUsers([...users, newUser]);
        return true;
    };

    const login = (username: string, password: string): boolean => {
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            return false;
        }

        setCurrentUser({
            role: user.role,
            id: user.associatedId,
            username: user.username,
        });
        return true;
    };

    const addStudent = (student: Omit<Student, 'id'>) => {
        const newStudent = { ...student, id: Math.random().toString(36).substr(2, 9) };
        setStudents([...students, newStudent]);
    };

    const updateStudent = (id: string, updates: Partial<Student>) => {
        setStudents(students.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };

    const deleteStudent = (id: string) => {
        setStudents(students.filter((s) => s.id !== id));
        // Also remove the associated user
        const student = students.find(s => s.id === id);
        if (student) {
            setUsers(users.filter(u => !(u.role === 'student' && u.associatedId === id)));
        }
    };

    const markAttendance = (studentId: string, present: boolean) => {
        const today = new Date().toISOString().split('T')[0];
        const newRecord: Attendance = {
            id: Math.random().toString(36).substr(2, 9),
            studentId,
            date: today,
            present,
        };
        // Remove existing record for today if any
        const filtered = attendance.filter(a => !(a.studentId === studentId && a.date === today));
        setAttendance([...filtered, newRecord]);
    };

    const getStudentStatus = (student: Student): 'active' | 'overdue' => {
        if (!student.lastPaymentDate) return 'overdue';
        const nextPayment = addDays(parseISO(student.lastPaymentDate), 30); // Simplified monthly logic
        return isAfter(new Date(), nextPayment) ? 'overdue' : 'active';
    };

    const logout = () => {
        setCurrentUser(null);
    };

    return (
        <BoxingContext.Provider
            value={{
                students,
                professors,
                users,
                attendance,
                payments,
                addStudent,
                updateStudent,
                deleteStudent,
                markAttendance,
                getStudentStatus,
                currentUser,
                login,
                logout,
                registerStudent,
                registerProfessor,
            }}
        >
            {children}
        </BoxingContext.Provider>
    );
};

export const useBoxing = () => {
    const context = useContext(BoxingContext);
    if (context === undefined) {
        throw new Error('useBoxing must be used within a BoxingProvider');
    }
    return context;
};
