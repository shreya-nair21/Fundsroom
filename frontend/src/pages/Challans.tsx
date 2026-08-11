import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Search, Plus, Eye, Printer, Trash2, CheckCircle, Ban, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface SelectedProductLine {
  productId: number;
  quantityOrdered: number;
  name: string;
  sku: string;
  unitPrice: number;
  availableStock: number;
}

const Challans: React.FC = () => {
  const { token, user, apiUrl } = useAuth();

  // Active view: 'list', 'create', or 'detail'
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');

  // List Challans State
  const [challans, setChallans] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail View State
  const [selectedChallanId, setSelectedChallanId] = useState<number | null>(null);
  const [challanDetail, setChallanDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create Challan State
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductLine[]>([]);
  const [createStatus, setCreateStatus] = useState<'DRAFT' | 'CONFIRMED'>('DRAFT');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isSales = user?.role === 'SALES';
  const isAccounts = user?.role === 'ACCOUNTS';
  const canCreate = isAdmin || isSales;
  const canUpdateStatus = isAdmin || isAccounts || isSales;

  // Fetch Challans
  const fetchChallans = async () => {
    setLoadingList(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
        status: statusFilter,
      });

      const response = await fetch(`${apiUrl}/challans?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setChallans(result.data);
        setTotalPages(result.meta.totalPages);
      }
    } catch (e) {
      console.error('Error fetching challans:', e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (view === 'list') {
      fetchChallans();
    }
  }, [view, page, search, statusFilter]);

  // Fetch single challan details
  const fetchChallanDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`${apiUrl}/challans/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setChallanDetail(result.data);
      }
    } catch (e) {
      console.error('Error fetching challan details:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (view === 'detail' && selectedChallanId) {
      fetchChallanDetail(selectedChallanId);
    } else {
      setChallanDetail(null);
    }
  }, [view, selectedChallanId]);

  // Load Customers & Products for Builder
  const loadBuilderResources = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Load customers
      const resCust = await fetch(`${apiUrl}/customers?limit=100`, { headers });
      const jsonCust = await resCust.json();
      if (jsonCust.success) setCustomers(jsonCust.data);

      // Load products
      const resProd = await fetch(`${apiUrl}/products?limit=100`, { headers });
      const jsonProd = await resProd.json();
      if (jsonProd.success) setProducts(jsonProd.data);

    } catch (e) {
      console.error('Error loading builder items:', e);
    }
  };

  // Open Builder View
  const handleOpenBuilder = () => {
    setSelectedCustomerId('');
    setSelectedProducts([]);
    setCreateStatus('DRAFT');
    setCreateError('');
    loadBuilderResources();
    setView('create');
  };

  // Add Product Line inside builder
  const handleAddProductLine = (productId: number) => {
    if (!productId) return;
    
    // Check if product already added
    if (selectedProducts.some(p => p.productId === productId)) return;

    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: prod.id,
        quantityOrdered: 1,
        name: prod.name,
        sku: prod.sku,
        unitPrice: prod.unitPrice,
        availableStock: prod.currentStock,
      }
    ]);
  };

  // Update quantity ordered on a line
  const handleUpdateQty = (productId: number, qty: number) => {
    setSelectedProducts(
      selectedProducts.map(p => {
        if (p.productId === productId) {
          return { ...p, quantityOrdered: Math.max(qty, 1) };
        }
        return p;
      })
    );
  };

  // Remove a line
  const handleRemoveLine = (productId: number) => {
    setSelectedProducts(selectedProducts.filter(p => p.productId !== productId));
  };

  // Calculate totals
  const totalQuantity = selectedProducts.reduce((sum, p) => sum + p.quantityOrdered, 0);
  const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.quantityOrdered * p.unitPrice), 0);

  // Submit Challan
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!selectedCustomerId) {
      setCreateError('Please select a customer');
      return;
    }

    if (selectedProducts.length === 0) {
      setCreateError('Please add at least one product');
      return;
    }

    // Check stock if status is confirmed
    if (createStatus === 'CONFIRMED') {
      const overStockItem = selectedProducts.find(p => p.quantityOrdered > p.availableStock);
      if (overStockItem) {
        setCreateError(`Insufficient stock for '${overStockItem.name}'. Available: ${overStockItem.availableStock}, Requested: ${overStockItem.quantityOrdered}`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiUrl}/challans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerId: Number(selectedCustomerId),
          status: createStatus,
          products: selectedProducts.map(p => ({
            productId: p.productId,
            quantityOrdered: p.quantityOrdered,
          })),
        }),
      });

      const result = await response.json();

      if (result.success) {
        setView('list');
      } else {
        setCreateError(result.message || 'Failed to create challan');
      }
    } catch (err) {
      console.error('Error submitting challan:', err);
      setCreateError('Connection server error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update Challan Status (Confirm Draft / Cancel)
  const handleUpdateStatus = async (id: number, targetStatus: 'CONFIRMED' | 'CANCELLED') => {
    if (!window.confirm(`Are you sure you want to update this challan status to ${targetStatus}?`)) return;

    try {
      const response = await fetch(`${apiUrl}/challans/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const result = await response.json();

      if (result.success) {
        fetchChallanDetail(id); // Reload details
      } else {
        alert(result.message || 'Status update failed');
      }
    } catch (e) {
      console.error('Error updating status:', e);
      alert('Network error updating status');
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <Navbar title="Sales Challans" />
            {canCreate && (
              <button onClick={handleOpenBuilder} className="btn btn-primary">
                <Plus size={18} />
                <span>Create Challan</span>
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div className="table-controls" style={{ margin: 0 }}>
              <div className="search-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by challan number, customer name..."
                  className="form-input search-input"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <select
                className="form-input"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            {loadingList ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading challans...</p>
              </div>
            ) : challans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)' }}>No challans found.</p>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Challan Number</th>
                        <th>Customer</th>
                        <th>Business Profile</th>
                        <th>Total Items</th>
                        <th>Status</th>
                        <th>Created By</th>
                        <th>Date Created</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {challans.map((ch) => (
                        <tr key={ch.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{ch.challanNumber}</td>
                          <td style={{ fontWeight: 600 }}>{ch.customer.name}</td>
                          <td>{ch.customer.businessName}</td>
                          <td>{ch.totalQuantity} units</td>
                          <td>
                            <span className={`badge ${
                              ch.status === 'CONFIRMED' ? 'badge-success' : 
                              ch.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {ch.status}
                            </span>
                          </td>
                          <td>{ch.createdBy.name}</td>
                          <td>{new Date(ch.createdAt).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setSelectedChallanId(ch.id);
                                setView('detail');
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', gap: '4px', float: 'right' }}
                            >
                              <Eye size={14} />
                              <span>View Invoice</span>
                            </button>
                          </td>
                        </tr>
                      ))}
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
                      Page <strong>{page}</strong> of <strong>{totalPages}</strong>
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

      {view === 'create' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <button onClick={() => setView('list')} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <ArrowLeft size={18} />
            </button>
            <h1 className="page-title">New Sales Challan Builder</h1>
          </div>

          <form onSubmit={handleCreateSubmit}>
            <div className="challan-builder-grid">
              {/* Left Column: Product Selection Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>1. Customer & Product Selection</h3>
                  
                  {createError && (
                    <div style={{ 
                      backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                      border: '1px solid rgba(239, 68, 68, 0.2)', 
                      borderRadius: '8px', 
                      padding: '12px 16px', 
                      marginBottom: '16px',
                      color: '#ef4444',
                      fontSize: '0.88rem'
                    }}>
                      {createError}
                    </div>
                  )}

                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">Select Customer</label>
                    <select
                      className="form-input"
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
                      required
                    >
                      <option value="">-- Choose Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.businessName})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Add Product to Order</label>
                    <select
                      className="form-input"
                      value=""
                      onChange={(e) => handleAddProductLine(Number(e.target.value))}
                    >
                      <option value="">-- Choose Product to Add --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} disabled={selectedProducts.some(line => line.productId === p.id)}>
                          {p.name} (SKU: {p.sku}) | Stock: {p.currentStock} | Price: ${p.unitPrice.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>2. Selected Items List</h3>
                  
                  {selectedProducts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '30px' }}>
                      No items added yet. Select products from the dropdown above.
                    </p>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>SKU / Product</th>
                            <th>Unit Price</th>
                            <th style={{ width: '120px' }}>Qty Ordered</th>
                            <th>Available Stock</th>
                            <th>Line Total</th>
                            <th style={{ textAlign: 'right' }}>Remove</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProducts.map((line) => {
                            const isOverStock = line.quantityOrdered > line.availableStock;
                            return (
                              <tr key={line.productId}>
                                <td>
                                  <div style={{ fontWeight: 600 }}>{line.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {line.sku}</div>
                                </td>
                                <td>${line.unitPrice.toFixed(2)}</td>
                                <td>
                                  <input
                                    type="number"
                                    min="1"
                                    className="form-input"
                                    style={{ padding: '6px 10px', fontSize: '0.85rem', width: '80px', borderColor: isOverStock ? 'var(--danger)' : 'var(--border-color)' }}
                                    value={line.quantityOrdered}
                                    onChange={(e) => handleUpdateQty(line.productId, Number(e.target.value))}
                                    required
                                  />
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600, color: isOverStock ? 'var(--danger)' : 'inherit' }}>
                                    {line.availableStock} units
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>
                                  ${(line.quantityOrdered * line.unitPrice).toFixed(2)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(line.productId)}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px', color: 'var(--danger)' }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Order Summary & Action Panel */}
              <div className="card" style={{ height: 'fit-content' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px' }}>3. Summary & Issue</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Item Types:</span>
                    <span style={{ fontWeight: 600 }}>{selectedProducts.length}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Quantities:</span>
                    <span style={{ fontWeight: 600 }}>{totalQuantity} units</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', borderTop: '1px dashed var(--border-color)', paddingTop: '12px' }}>
                    <span style={{ fontWeight: 600 }}>Estimated Amount:</span>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Submission Mode</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input
                        type="radio"
                        name="createStatus"
                        checked={createStatus === 'DRAFT'}
                        onChange={() => setCreateStatus('DRAFT')}
                      />
                      <span>Save as Draft (No stock changes)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input
                        type="radio"
                        name="createStatus"
                        checked={createStatus === 'CONFIRMED'}
                        onChange={() => setCreateStatus('CONFIRMED')}
                      />
                      <span>Confirm & Deduct Stock immediately</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px', justifyContent: 'center' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Challan...' : createStatus === 'DRAFT' ? 'Save Draft Challan' : 'Confirm & Issue Challan'}
                </button>
              </div>
            </div>
          </form>
        </>
      )}

      {view === 'detail' && (
        <>
          <div className="hide-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button onClick={() => setView('list')} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                <ArrowLeft size={18} />
              </button>
              <h1 className="page-title">Sales Invoice View</h1>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => window.print()} className="btn btn-secondary">
                <Printer size={16} />
                <span>Print Invoice</span>
              </button>

              {challanDetail && challanDetail.status === 'DRAFT' && canUpdateStatus && (
                <button 
                  onClick={() => handleUpdateStatus(challanDetail.id, 'CONFIRMED')} 
                  className="btn btn-success"
                >
                  <CheckCircle size={16} />
                  <span>Confirm Draft</span>
                </button>
              )}

              {challanDetail && challanDetail.status !== 'CANCELLED' && canUpdateStatus && (
                <button 
                  onClick={() => handleUpdateStatus(challanDetail.id, 'CANCELLED')} 
                  className="btn btn-danger"
                >
                  <Ban size={16} />
                  <span>Cancel Order</span>
                </button>
              )}
            </div>
          </div>

          {loadingDetail || !challanDetail ? (
            <div className="card">
              <p style={{ textAlign: 'center', padding: '40px' }}>Loading invoice data...</p>
            </div>
          ) : (
            <div className="invoice-preview">
              <div className="invoice-header">
                <div>
                  <h2 className="invoice-title">FUNDSROOM OPERATIONS PORTAL</h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '4px' }}>Wholesaler & Distributor Solutions</p>
                  <p style={{ color: '#64748b', fontSize: '0.85rem' }}>123 Corporate Park, Silicon Valley, CA</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    backgroundColor: challanDetail.status === 'CONFIRMED' ? '#d1fae5' : 
                                    challanDetail.status === 'DRAFT' ? '#fef3c7' : '#fee2e2',
                    color: challanDetail.status === 'CONFIRMED' ? '#065f46' : 
                           challanDetail.status === 'DRAFT' ? '#92400e' : '#991b1b',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    display: 'inline-block',
                    marginBottom: '10px'
                  }}>
                    {challanDetail.status}
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{challanDetail.challanNumber}</h3>
                </div>
              </div>

              <div className="invoice-details">
                <div>
                  <div style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.5px' }}>
                    Billed & Shipped To:
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>{challanDetail.customer.name}</div>
                  <div style={{ fontSize: '0.9rem', color: '#475569', fontWeight: 600 }}>{challanDetail.customer.businessName}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px', maxWidth: '280px' }}>{challanDetail.customer.address}</div>
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '6px' }}>Phone: {challanDetail.customer.mobile} | Email: {challanDetail.customer.email}</div>
                  {challanDetail.customer.gstNumber && (
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '2px' }}>GSTIN: {challanDetail.customer.gstNumber}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Date Issued:</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                        {new Date(challanDetail.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Created By:</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                        {challanDetail.createdBy.name} ({challanDetail.createdBy.role})
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Challan Class:</span>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                        {challanDetail.customer.customerType}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Item SKU</th>
                    <th>Product Description (Snapshot)</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Qty Ordered</th>
                    <th style={{ textAlign: 'right' }}>Line Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {challanDetail.products.map((item: any) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: '#475569' }}>{item.skuSnapshot}</td>
                      <td style={{ fontWeight: 600, color: '#1e293b' }}>{item.nameSnapshot}</td>
                      <td style={{ textAlign: 'right' }}>${item.unitPriceSnapshot.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>{item.quantityOrdered} units</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                        ${item.totalPrice.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="invoice-summary">
                <div className="invoice-summary-box">
                  <div className="invoice-summary-row">
                    <span style={{ color: '#64748b' }}>Total Items:</span>
                    <span style={{ fontWeight: 600, color: '#334155' }}>{challanDetail.totalQuantity} units</span>
                  </div>
                  <div className="invoice-summary-row total">
                    <span>Grand Total:</span>
                    <span>
                      ${challanDetail.products.reduce((sum: number, p: any) => sum + p.totalPrice, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #f1f5f9', marginTop: '60px', paddingTop: '20px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                Thank you for your business! For queries contact support@fundsroom.com. 
                <br />
                This is a computer-generated transaction invoice copy.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Challans;
