import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Search, Plus, Edit2, ShieldAlert, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight, Settings, X } from 'lucide-react';

const Inventory: React.FC = () => {
  const { token, user, apiUrl } = useAuth();

  // Active tab: 'products' or 'logs'
  const [activeTab, setActiveTab] = useState<'products' | 'logs'>('products');

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Global Stock Movements Logs State
  const [movementLogs, setMovementLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  // Product Form Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [formProduct, setFormProduct] = useState<any | null>(null); // Null for create, product object for edit
  const [productData, setProductData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlert: 10,
    location: '',
  });
  const [productErrors, setProductErrors] = useState<any>({});

  // Stock Adjustment Modal State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentProduct, setAdjustmentProduct] = useState<any | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 1,
    movementType: 'IN',
    reason: '',
  });
  const [adjustmentError, setAdjustmentError] = useState('');

  const isAdmin = user?.role === 'ADMIN';
  const isWarehouse = user?.role === 'WAREHOUSE';
  const canModify = isAdmin || isWarehouse;

  // Fetch Products
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '8',
        search,
        category: categoryFilter,
        lowStock: lowStockFilter.toString(),
      });

      const response = await fetch(`${apiUrl}/products?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setProducts(result.data);
        setTotalPages(result.meta.totalPages);
        setTotalItems(result.meta.total);
      }
    } catch (e) {
      console.error('Error fetching products:', e);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch Movement Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await fetch(`${apiUrl}/products/movements/logs?page=${logPage}&limit=12`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setMovementLogs(result.data);
        setLogTotalPages(result.meta.totalPages);
      }
    } catch (e) {
      console.error('Error fetching stock movement logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else {
      fetchLogs();
    }
  }, [activeTab, page, search, categoryFilter, lowStockFilter, logPage]);

  // Handle open Product Form Modal
  const openProductModal = (product: any | null = null) => {
    setFormProduct(product);
    setProductErrors({});
    if (product) {
      setProductData({
        name: product.name,
        sku: product.sku,
        category: product.category,
        unitPrice: product.unitPrice,
        currentStock: product.currentStock,
        minStockAlert: product.minStockAlert,
        location: product.location,
      });
    } else {
      setProductData({
        name: '',
        sku: '',
        category: '',
        unitPrice: 0,
        currentStock: 0,
        minStockAlert: 10,
        location: '',
      });
    }
    setShowProductModal(true);
  };

  // Product Form Submit Handler
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductErrors({});

    const bodyData = {
      ...productData,
      unitPrice: Number(productData.unitPrice),
      currentStock: Number(productData.currentStock),
      minStockAlert: Number(productData.minStockAlert),
    };

    try {
      const url = formProduct ? `${apiUrl}/products/${formProduct.id}` : `${apiUrl}/products`;
      const method = formProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json();

      if (result.success) {
        setShowProductModal(false);
        fetchProducts();
      } else if (result.errors) {
        setProductErrors(result.errors);
      } else {
        alert(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error submitting product form:', err);
    }
  };

  // Handle open Adjustment Modal
  const openAdjustmentModal = (product: any) => {
    setAdjustmentProduct(product);
    setAdjustmentError('');
    setAdjustmentData({
      quantity: 1,
      movementType: 'IN',
      reason: '',
    });
    setShowAdjustmentModal(true);
  };

  // Adjustment Submit Handler
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustmentError('');
    if (!adjustmentProduct) return;

    const bodyData = {
      quantity: Number(adjustmentData.quantity),
      movementType: adjustmentData.movementType,
      reason: adjustmentData.reason,
    };

    try {
      const response = await fetch(`${apiUrl}/products/${adjustmentProduct.id}/adjust-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json();

      if (result.success) {
        setShowAdjustmentModal(false);
        fetchProducts();
      } else {
        setAdjustmentError(result.message || 'Failed to adjust stock');
      }
    } catch (err) {
      console.error('Error adjusting stock:', err);
      setAdjustmentError('Internal server error connection');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Navbar title="Inventory & Stock" />
        <div style={{ display: 'flex', gap: '10px' }}>
          {canModify && activeTab === 'products' && (
            <button onClick={() => openProductModal(null)} className="btn btn-primary">
              <Plus size={18} />
              <span>Add Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <button 
          onClick={() => setActiveTab('products')} 
          style={{ 
            padding: '12px 24px', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'products' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'products' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          Product Catalog
        </button>
        <button 
          onClick={() => setActiveTab('logs')} 
          style={{ 
            padding: '12px 24px', 
            background: 'transparent', 
            border: 'none', 
            borderBottom: activeTab === 'logs' ? '2px solid var(--primary)' : '2px solid transparent',
            color: activeTab === 'logs' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.95rem',
            transition: 'all var(--transition-fast)'
          }}
        >
          Stock Movement Log
        </button>
      </div>

      {activeTab === 'products' && (
        <>
          {/* Filters card */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div className="table-controls" style={{ margin: 0 }}>
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by product name, SKU..."
                  className="form-input search-input"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filter Category (e.g. Hardware)"
                  className="form-input"
                  style={{ padding: '8px 16px', fontSize: '0.85rem', width: '180px' }}
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                />

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={lowStockFilter}
                    onChange={(e) => {
                      setLowStockFilter(e.target.checked);
                      setPage(1);
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <span style={{ color: lowStockFilter ? 'var(--warning)' : 'inherit', fontWeight: lowStockFilter ? 600 : 'inherit' }}>
                    Show Low Stock Alerts Only
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Products Table Card */}
          <div className="card">
            {loadingProducts ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)' }}>No products found.</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Product SKU</th>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Location/Bin</th>
                        <th>Unit Price</th>
                        <th>Stock Level</th>
                        <th>Status Alert</th>
                        {canModify && <th style={{ textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const isLowStock = p.currentStock <= p.minStockAlert;
                        return (
                          <tr key={p.id} style={{ 
                            backgroundColor: isLowStock ? 'rgba(245, 158, 11, 0.02)' : 'inherit'
                          }}>
                            <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{p.sku}</td>
                            <td style={{ fontWeight: 600 }}>{p.name}</td>
                            <td>{p.category}</td>
                            <td>{p.location}</td>
                            <td>${p.unitPrice.toFixed(2)}</td>
                            <td style={{ fontWeight: 800, fontSize: '1.05rem', color: isLowStock ? 'var(--warning)' : 'inherit' }}>
                              {p.currentStock} units
                            </td>
                            <td>
                              {isLowStock ? (
                                <span className="badge badge-warning" style={{ display: 'flex', width: 'fit-content', gap: '4px', alignItems: 'center' }}>
                                  <ShieldAlert size={12} />
                                  <span>Reorder Alert</span>
                                </span>
                              ) : (
                                <span className="badge badge-success">Healthy</span>
                              )}
                            </td>
                            {canModify && (
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                  <button
                                    onClick={() => openAdjustmentModal(p)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', gap: '4px' }}
                                    title="Adjust Stock level manually"
                                  >
                                    <Settings size={14} />
                                    <span>Adjust</span>
                                  </button>
                                  <button
                                    onClick={() => openProductModal(p)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 10px' }}
                                    title="Edit Product details"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <button
                      className="pagination-btn"
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="pagination-info">
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} products)
                    </span>
                    <button
                      className="pagination-btn"
                      onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'logs' && (
        <div className="card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Global Stock Movement History</h3>
          
          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Loading movement logs...</p>
            </div>
          ) : movementLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No movements logged yet.</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Product</th>
                      <th>SKU</th>
                      <th>Change</th>
                      <th>Type</th>
                      <th>Reason</th>
                      <th>Logged By (Role)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.85rem' }}>{new Date(log.timestamp).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{log.product.name}</td>
                        <td>{log.product.sku}</td>
                        <td style={{ 
                          color: log.movementType === 'IN' ? 'var(--success)' : 'var(--danger)',
                          fontWeight: 700
                        }}>
                          {log.movementType === 'IN' ? '+' : '-'}{log.quantityChanged}
                        </td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}>
                            {log.movementType === 'IN' ? (
                              <ArrowUpRight size={14} style={{ color: 'var(--success)' }} />
                            ) : (
                              <ArrowDownRight size={14} style={{ color: 'var(--danger)' }} />
                            )}
                            {log.movementType}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{log.reason}</td>
                        <td>{log.createdBy.name} ({log.createdBy.role})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logTotalPages > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => setLogPage((p) => Math.max(p - 1, 1))}
                    disabled={logPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="pagination-info">
                    Page <strong>{logPage}</strong> of <strong>{logTotalPages}</strong>
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => setLogPage((p) => Math.min(p + 1, logTotalPages))}
                    disabled={logPage === logTotalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{formProduct ? 'Edit Product Catalog' : 'Add New Product'}</h2>
              <button onClick={() => setShowProductModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={productData.name}
                  onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">SKU Code (Unique)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ST-PIPE-001"
                    value={productData.sku}
                    onChange={(e) => setProductData({ ...productData, sku: e.target.value })}
                    required
                    disabled={formProduct !== null} // Lock SKU on edit
                  />
                  {productErrors.sku && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{productErrors.sku[0]}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Hardware"
                    value={productData.category}
                    onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    value={productData.unitPrice}
                    onChange={(e) => setProductData({ ...productData, unitPrice: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Minimum Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={productData.minStockAlert}
                    onChange={(e) => setProductData({ ...productData, minStockAlert: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Location / Warehouse Bin</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Aisle 4 - Shelf B"
                    value={productData.location}
                    onChange={(e) => setProductData({ ...productData, location: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Current Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={productData.currentStock}
                    onChange={(e) => setProductData({ ...productData, currentStock: Number(e.target.value) })}
                    required
                    disabled={formProduct !== null && !isAdmin} // Only admin can overwrite stock in edit form directly, warehouse must use manual adjustment!
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={() => setShowProductModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && adjustmentProduct && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Manual Stock Adjustment</h2>
              <button onClick={() => setShowAdjustmentModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAdjustmentSubmit}>
              <div style={{ marginBottom: '16px', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PRODUCT</div>
                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{adjustmentProduct.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  SKU: {adjustmentProduct.sku} | Available Stock: <strong style={{ color: 'var(--primary)' }}>{adjustmentProduct.currentStock}</strong>
                </div>
              </div>

              {adjustmentError && (
                <div style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  borderRadius: '8px', 
                  padding: '10px 14px', 
                  marginBottom: '16px',
                  color: '#ef4444',
                  fontSize: '0.85rem'
                }}>
                  {adjustmentError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Adjustment Type</label>
                  <select
                    className="form-input"
                    value={adjustmentData.movementType}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, movementType: e.target.value })}
                  >
                    <option value="IN">Intake (IN)</option>
                    <option value="OUT">Issue / Shipment (OUT)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: Number(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Reason / Memo</label>
                <textarea
                  className="form-input"
                  placeholder="e.g., Manual intake of restock, or damaged items replacement"
                  rows={3}
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAdjustmentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
