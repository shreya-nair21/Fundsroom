import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, Boxes, FileSpreadsheet, LogOut } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} />, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
    { id: 'customers', name: 'Customer CRM', icon: <Users size={20} />, roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
    { id: 'inventory', name: 'Inventory & Stock', icon: <Boxes size={20} />, roles: ['ADMIN', 'WAREHOUSE', 'ACCOUNTS'] },
    { id: 'challans', name: 'Sales Challans', icon: <FileSpreadsheet size={20} />, roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] }
  ];

  const allowedMenuItems = menuItems.filter(item => item.roles.includes(user.role));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <span>FUNDSROOM ERP</span>
      </div>
      
      <ul className="sidebar-menu">
        {allowedMenuItems.map(item => (
          <li 
            key={item.id} 
            className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
          >
            <button onClick={() => setCurrentPage(item.id)}>
              {item.icon}
              <span>{item.name}</span>
            </button>
          </li>
        ))}
      </ul>
      
      <div className="sidebar-footer">
        <div className="user-profile-badge" style={{ marginBottom: '12px' }}>
          <div className="user-avatar">
            {getInitials(user.name)}
          </div>
          <div className="user-details">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role}</span>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="btn btn-secondary"
          style={{ 
            width: '100%', 
            justifyContent: 'flex-start',
            padding: '10px 14px',
            fontSize: '0.85rem'
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
