
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { BoxingProvider, useBoxing } from './context/BoxingContext';
import Login from './pages/Login';
import ProfessorDashboard from './pages/ProfessorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StudentRegistration from './pages/StudentRegistration';
import ProfessorRegistration from './pages/ProfessorRegistration';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role: 'professor' | 'student' }) => {
  const { currentUser } = useBoxing();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (currentUser.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BoxingProvider>
      <BrowserRouter>
        <div className="bg-[url('/boxe.jpg')] bg-cover bg-center h-screen">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register/student" element={<StudentRegistration />} />
            {/* Hidden professor registration - access via /register/professor/secret */}
            <Route path="/register/professor/secret" element={<ProfessorRegistration />} />
            <Route path="/professor" element={
              <ProtectedRoute role="professor">
                <ProfessorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </BrowserRouter>
    </BoxingProvider>
  );
}

export default App;
