import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Users, Boxes, AlertTriangle, FileSpreadsheet, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { token, user, apiUrl } = useAuth();
  
  const [stats, setStats] = useState({
    customersCount: 0,
    productsCount: 0,
    lowStockCount: 0,
    challansCount: 0,
  });
  
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentMovements, setRecentMovements] = useState<any[]>([]);
  const [recentChallans, setRecentChallans] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const isAdmin = user?.role === 'ADMIN';
  const isSales = user?.role === 'SALES';
  const isWarehouse = user?.role === 'WAREHOUSE';
  const isAccounts = user?.role === 'ACCOUNTS';

  const showCRM = isAdmin || isSales || isAccounts;
  const showInventory = isAdmin || isWarehouse || isAccounts;
  const showChallans = isAdmin || isSales || isWarehouse || isAccounts;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      try {
        let customersCount = 0;
        let productsCount = 0;
        let lowStockCount = 0;
        let challansCount = 0;
        
        // 1. Fetch CRM stats if allowed
        if (showCRM) {
          const res = await fetch(`${apiUrl}/customers?limit=1`, { headers });
          const json = await res.json();
          if (json.success) customersCount = json.meta.total;
        }

        // 2. Fetch Inventory stats if allowed
        if (showInventory) {
          // Total products count
          const resProd = await fetch(`${apiUrl}/products?limit=1`, { headers });
          const jsonProd = await resProd.json();
          if (jsonProd.success) productsCount = jsonProd.meta.total;

          // Low stock products and count
          const resLow = await fetch(`${apiUrl}/products?lowStock=true&limit=5`, { headers });
          const jsonLow = await resLow.json();
          if (jsonLow.success) {
            setLowStockProducts(jsonLow.data);
            lowStockCount = jsonLow.meta.total;
          }

          // Recent stock movements
          const resMove = await fetch(`${apiUrl}/products/movements/logs?limit=5`, { headers });
          const jsonMove = await resMove.json();
          if (jsonMove.success) setRecentMovements(jsonMove.data);
        }

        // 3. Fetch Challan stats if allowed
        if (showChallans) {
          const resChal = await fetch(`${apiUrl}/challans?limit=5`, { headers });
          const jsonChal = await resChal.json();
          if (jsonChal.success) {
            setRecentChallans(jsonChal.data);
            challansCount = jsonChal.meta.total;
          }
        }

        setStats({
          customersCount,
          productsCount,
          lowStockCount,
          challansCount,
        });

      } catch (e) {
        console.error('Error fetching dashboard statistics:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, refreshKey, apiUrl, showCRM, showInventory, showChallans]);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Navbar title="Dashboard Overview" />
        <button 
          onClick={triggerRefresh} 
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="user-avatar" style={{ animation: 'pulse 1.5s infinite' }}>...</div>
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Summary Grid */}
          <div className="stats-grid">
            {showCRM && (
              <div className="card stat-card">
                <div>
                  <span className="stat-label">Total CRM Customers</span>
                  <div className="stat-value">{stats.customersCount}</div>
                </div>
                <div className="stat-icon primary">
                  <Users size={24} />
                </div>
              </div>
            )}

            {showInventory && (
              <div className="card stat-card">
                <div>
                  <span className="stat-label">Unique Products</span>
                  <div className="stat-value">{stats.productsCount}</div>
                </div>
                <div className="stat-icon success">
                  <Boxes size={24} />
                </div>
              </div>
            )}

            {showInventory && (
              <div className="card stat-card">
                <div>
                  <span className="stat-label">Low Stock Alerts</span>
                  <div className="stat-value" style={{ color: stats.lowStockCount > 0 ? 'var(--warning)' : 'inherit' }}>
                    {stats.lowStockCount}
                  </div>
                </div>
                <div className="stat-icon warning">
                  <AlertTriangle size={24} />
                </div>
              </div>
            )}

            {showChallans && (
              <div className="card stat-card">
                <div>
                  <span className="stat-label">Sales Challans</span>
                  <div className="stat-value">{stats.challansCount}</div>
                </div>
                <div className="stat-icon danger">
                  <FileSpreadsheet size={24} />
                </div>
              </div>
            )}
          </div>

          {/* Detailed Lists Grid */}
          <div className="dashboard-grid">
            {/* Left side panel - Confirmed Challans or Stock movements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {showChallans && (
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Recent Sales Challans</h3>
                  <div className="table-container">
                    {recentChallans.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No recent challans found.</p>
                    ) : (
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Challan No</th>
                            <th>Customer</th>
                            <th>Total Qty</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentChallans.map((challan) => (
                            <tr key={challan.id}>
                              <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{challan.challanNumber}</td>
                              <td>{challan.customer.name}</td>
                              <td>{challan.totalQuantity} items</td>
                              <td>
                                <span className={`badge ${
                                  challan.status === 'CONFIRMED' ? 'badge-success' : 
                                  challan.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                                }`}>
                                  {challan.status}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.8rem' }}>
                                {new Date(challan.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {showInventory && (
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Recent Inventory Movements</h3>
                  <div className="table-container">
                    {recentMovements.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No movements logged yet.</p>
                    ) : (
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Change</th>
                            <th>Type</th>
                            <th>Reason</th>
                            <th>Logged By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentMovements.map((move) => (
                            <tr key={move.id}>
                              <td style={{ fontWeight: 600 }}>{move.product.name}</td>
                              <td style={{ 
                                color: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)',
                                fontWeight: 700
                              }}>
                                {move.movementType === 'IN' ? '+' : '-'}{move.quantityChanged}
                              </td>
                              <td>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                                  {move.movementType === 'IN' ? (
                                    <ArrowUpRight size={14} style={{ color: 'var(--success)' }} />
                                  ) : (
                                    <ArrowDownRight size={14} style={{ color: 'var(--danger)' }} />
                                  )}
                                  {move.movementType}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.85rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={move.reason}>
                                {move.reason}
                              </td>
                              <td>{move.createdBy.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right side panel - Low stock alerts or quick CRM info */}
            <div>
              {showInventory && (
                <div className="card" style={{ height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Critical Low Stock</h3>
                  </div>
                  
                  {lowStockProducts.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px 20px', 
                      backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px dashed rgba(16, 185, 129, 0.2)' 
                    }}>
                      <Boxes size={32} style={{ color: 'var(--success)', marginBottom: '10px' }} />
                      <p style={{ color: 'var(--success)', fontSize: '0.9rem', fontWeight: 600 }}>All Stock Levels Healthy!</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>No items require immediate reorder.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {lowStockProducts.map((prod) => (
                        <div key={prod.id} style={{ 
                          backgroundColor: 'rgba(245, 158, 11, 0.04)', 
                          border: '1px solid rgba(245, 158, 11, 0.15)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{prod.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {prod.sku}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--warning)' }}>{prod.currentStock}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Limit: {prod.minStockAlert}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!showInventory && showCRM && (
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px' }}>
                  <Users size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>CRM & Sales Portal</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '280px' }}>
                    Use the side menu to access Customer follow-ups, business profiles, and log new sales challan orders.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
