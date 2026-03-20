import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientFormWorkspace from './pages/PatientFormWorkspace';
import Appointments from './pages/Appointments';
import MedicalCertificates from './pages/MedicalCertificates';
import DossierMedicaux from './pages/DossierMedicaux';
import Ordonnances from './pages/Ordonnances';
import Statistics from './pages/Statistics';
import PatientTreatments from './pages/PatientTreatments';
import StartTreatmentWorkspace from './pages/StartTreatmentWorkspace';
import StartSessionWorkspace from './pages/StartSessionWorkspace';
import PatientTreatmentsHistory from './pages/PatientTreatmentsHistory';
import PatientDossier from './pages/PatientDossier';
import Achats from './pages/Achats';
import Factures from './pages/Factures';
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
            path="/patients/new"
            element={
              <ProtectedRoute>
                <PatientFormWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients/:id/edit"
            element={
              <ProtectedRoute>
                <PatientFormWorkspace />
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
            path="/treatments/new"
            element={
              <ProtectedRoute>
                <StartTreatmentWorkspace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/treatments/:treatmentId/session"
            element={
              <ProtectedRoute>
                <StartSessionWorkspace />
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
            path="/ordonnances"
            element={
              <ProtectedRoute>
                <Ordonnances />
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
          <Route
            path="/factures"
            element={
              <ProtectedRoute>
                <Factures />
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
