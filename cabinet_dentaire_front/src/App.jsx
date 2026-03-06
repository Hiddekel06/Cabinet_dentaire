import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import Patients from './pages/Patients';
import Appointments from './pages/Appointments';
import MedicalCertificates from './pages/MedicalCertificates';
import DossierMedicaux from './pages/DossierMedicaux';
import Statistics from './pages/Statistics';
import PatientTreatments from './pages/PatientTreatments';
import PatientTreatmentsHistory from './pages/PatientTreatmentsHistory';
import PatientDossier from './pages/PatientDossier';
import Achats from './pages/Achats';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTreatments from './pages/admin/AdminTreatments';
import ImportDentalActs from './pages/admin/ImportDentalActs';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<Login />} />


          {/* Routes protégées */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <Patients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <Appointments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/treatments"
            element={
              <ProtectedRoute>
                <PatientTreatments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/treatments/history"
            element={
              <ProtectedRoute>
                <PatientTreatmentsHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients/:id/dossier"
            element={
              <ProtectedRoute>
                <PatientDossier />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/treatments"
            element={
              <ProtectedRoute>
                <AdminTreatments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/import-dental-acts"
            element={
              <ProtectedRoute>
                <ImportDentalActs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <Statistics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medical-certificates"
            element={
              <ProtectedRoute>
                <MedicalCertificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medical-records"
            element={
              <ProtectedRoute>
                <DossierMedicaux />
              </ProtectedRoute>
            }
          />
          <Route
            path="/achats"
            element={
              <ProtectedRoute>
                <Achats />
              </ProtectedRoute>
            }
          />
          {/* Redirection par défaut */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
