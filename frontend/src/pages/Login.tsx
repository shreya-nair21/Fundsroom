import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.message);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (role: string) => {
    setError('');
    switch (role) {
      case 'ADMIN':
        setEmail('admin@fundsroom.com');
        setPassword('admin123');
        break;
      case 'SALES':
        setEmail('sales@fundsroom.com');
        setPassword('sales123');
        break;
      case 'WAREHOUSE':
        setEmail('warehouse@fundsroom.com');
        setPassword('warehouse123');
        break;
      case 'ACCOUNTS':
        setEmail('accounts@fundsroom.com');
        setPassword('accounts123');
        break;
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="user-avatar" style={{ width: '60px', height: '60px' }}>
            <ShieldCheck size={32} />
          </div>
        </div>
        <h1 className="login-logo">Fundsroom ERP</h1>
        <p className="login-subtitle">Mini ERP + CRM Operations Portal</p>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '8px', 
            padding: '12px 16px', 
            marginBottom: '20px',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            textAlign: 'left'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} style={{ position: 'absolute', left: '16px', color: '#94a3b8' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '48px', width: '100%' }}
                placeholder="name@fundsroom.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '16px', color: '#94a3b8' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '48px', width: '100%' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="role-helper-select">
          <p style={{ fontWeight: 600, marginBottom: '8px', color: '#cbd5e1', fontSize: '0.8rem' }}>
            TEST DEMO CREDENTIALS QUICK-FILL
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button 
              type="button" 
              onClick={() => handleQuickFill('ADMIN')} 
              className="btn btn-secondary" 
              style={{ padding: '6px 8px', fontSize: '0.75rem' }}
            >
              System Admin
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('SALES')} 
              className="btn btn-secondary" 
              style={{ padding: '6px 8px', fontSize: '0.75rem' }}
            >
              Sales Rep
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('WAREHOUSE')} 
              className="btn btn-secondary" 
              style={{ padding: '6px 8px', fontSize: '0.75rem' }}
            >
              Warehouse
            </button>
            <button 
              type="button" 
              onClick={() => handleQuickFill('ACCOUNTS')} 
              className="btn btn-secondary" 
              style={{ padding: '6px 8px', fontSize: '0.75rem' }}
            >
              Accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
