import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface NavbarProps {
  title: string;
}

const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user } = useAuth();

  return (
    <div className="navbar">
      <h1 className="page-title">{title}</h1>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          backgroundColor: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-color)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '0.85rem'
        }}>
          <ShieldAlert size={16} style={{ color: 'var(--primary)' }} />
          <span>Active Role: <strong style={{ color: 'var(--text-main)' }}>{user?.role}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
