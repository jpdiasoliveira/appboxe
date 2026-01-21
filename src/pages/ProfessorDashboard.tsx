import { useState } from 'react';
import { useBoxing } from '../context/BoxingContext';
import StudentList from '../components/StudentList';
import StudentForm from '../components/StudentForm';
import type { Student } from '../types';
import { Plus, Calendar, MapPin, LogOut } from 'lucide-react';

const ProfessorDashboard = () => {
  const { addStudent, updateStudent, logout } = useBoxing();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  const [schedule, setSchedule] = useState('Seg, Qua, Sex - 19:00');
  const [location, setLocation] = useState('CT Boxing Club - Rua Principal, 123');

  const handleAddClick = () => {
    setEditingStudent(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleSaveStudent = (studentData: Omit<Student, 'id'>) => {
    addStudent(studentData);
    setIsFormOpen(false);
  };

  const handleUpdateStudent = (id: string, studentData: Partial<Student>) => {
    updateStudent(id, studentData);
    setIsFormOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Painel do Professor</h1>
            <p className="text-slate-400">Gerencie seus alunos e treinos</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-slate-300"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3 mb-4 text-indigo-400">
              <Calendar className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Horários de Treino</h3>
            </div>
            <input
              type="text"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3 mb-4 text-emerald-400">
              <MapPin className="w-6 h-6" />
              <h3 className="font-semibold text-lg">Localização</h3>
            </div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Students Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Alunos</h2>
            <button
              onClick={handleAddClick}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              Novo Aluno
            </button>
          </div>

          <StudentList onEdit={handleEditClick} />
        </div>
      </div>

      {isFormOpen && (
        <StudentForm
          student={editingStudent}
          onSave={handleSaveStudent}
          onUpdate={handleUpdateStudent}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
};

export default ProfessorDashboard;
