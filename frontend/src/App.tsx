import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Challans from './pages/Challans';

const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (isLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#0b0f19',
        color: '#f8fafc',
        fontFamily: 'sans-serif'
      }}>
        <div>Loading Fundsroom ERP...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Define allowed pages by role
  const allowedPages: { [key: string]: string[] } = {
    ADMIN: ['dashboard', 'customers', 'inventory', 'challans'],
    SALES: ['dashboard', 'customers', 'challans'],
    WAREHOUSE: ['dashboard', 'inventory', 'challans'],
    ACCOUNTS: ['dashboard', 'customers', 'inventory', 'challans'],
  };

  // Safe navigation fallback if they land on an unpermitted page
  const userAllowedPages = allowedPages[user.role] || ['dashboard'];
  const activePage = userAllowedPages.includes(currentPage) ? currentPage : userAllowedPages[0];

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'inventory':
        return <Inventory />;
      case 'challans':
        return <Challans />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar currentPage={activePage} setCurrentPage={setCurrentPage} />
      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
