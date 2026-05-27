import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, getDefaultRouteForRole, useAuth } from './context/AuthContext';
import Login from './components/Login';
import TeacherDashboard from './components/TeacherDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import CanteenDashboard from './components/CanteenDashboard';
import { UserRole } from './types';
import './App.css';

const RequireAuth: React.FC<{ role?: UserRole; children: React.ReactElement }> = ({ role, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/teacher"
            element={
              <RequireAuth role="teacher">
                <TeacherDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/manager"
            element={
              <RequireAuth role="manager">
                <ManagerDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/canteen"
            element={
              <RequireAuth role="canteen">
                <CanteenDashboard />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

