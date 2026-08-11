import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Search, Plus, Edit2, Eye, Calendar, Phone, Mail, Building, PlusCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';

const Customers: React.FC = () => {
  const { token, user, apiUrl } = useAuth();

  // State for customer listing
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // State for Customer Add/Edit Form Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [formCustomer, setFormCustomer] = useState<any | null>(null); // Null for create, customer object for edit
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'RETAIL',
    address: '',
    status: 'LEAD',
    followUpDate: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<any>({});

  // State for Customer Details Drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<any | null>(null);
  const [newFollowUpNote, setNewFollowUpNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isSales = user?.role === 'SALES';
  const canModify = isAdmin || isSales;

  // Fetch customers list
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '8',
        search,
        status: statusFilter,
        type: typeFilter,
      });

      const response = await fetch(`${apiUrl}/customers?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data);
        setTotalPages(result.meta.totalPages);
        setTotalItems(result.meta.total);
      }
    } catch (e) {
      console.error('Error fetching customers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, statusFilter, typeFilter]);

  // Fetch customer detail
  const fetchCustomerDetail = async (id: number) => {
    try {
      const response = await fetch(`${apiUrl}/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setCustomerDetail(result.data);
      }
    } catch (e) {
      console.error('Error fetching customer detail:', e);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetail(selectedCustomerId);
    } else {
      setCustomerDetail(null);
    }
  }, [selectedCustomerId]);

  // Handle opening form modal
  const openFormModal = (customer: any | null = null) => {
    setFormCustomer(customer);
    setFormErrors({});
    if (customer) {
      setFormData({
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
        businessName: customer.businessName,
        gstNumber: customer.gstNumber || '',
        customerType: customer.customerType,
        address: customer.address,
        status: customer.status,
        followUpDate: customer.followUpDate ? new Date(customer.followUpDate).toISOString().slice(0, 10) : '',
        notes: customer.notes || '',
      });
    } else {
      setFormData({
        name: '',
        mobile: '',
        email: '',
        businessName: '',
        gstNumber: '',
        customerType: 'RETAIL',
        address: '',
        status: 'LEAD',
        followUpDate: '',
        notes: '',
      });
    }
    setShowFormModal(true);
  };

  // Form Submit Handler (Create/Edit)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const bodyData = {
      ...formData,
      gstNumber: formData.gstNumber || null,
      followUpDate: formData.followUpDate || null,
      notes: formData.notes || null,
    };

    try {
      const url = formCustomer ? `${apiUrl}/customers/${formCustomer.id}` : `${apiUrl}/customers`;
      const method = formCustomer ? 'PUT' : 'POST';

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
        setShowFormModal(false);
        fetchCustomers();
        // If editing currently selected customer, refresh details too
        if (selectedCustomerId && formCustomer && formCustomer.id === selectedCustomerId) {
          fetchCustomerDetail(selectedCustomerId);
        }
      } else if (result.errors) {
        setFormErrors(result.errors);
      } else {
        alert(result.message || 'Operation failed');
      }
    } catch (err) {
      console.error('Error submitting customer form:', err);
    }
  };

  // Add Follow up note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUpNote.trim() || !selectedCustomerId) return;

    setSubmittingNote(true);
    try {
      const response = await fetch(`${apiUrl}/customers/${selectedCustomerId}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note: newFollowUpNote }),
      });
      const result = await response.json();

      if (result.success) {
        setNewFollowUpNote('');
        fetchCustomerDetail(selectedCustomerId);
      }
    } catch (e) {
      console.error('Error adding follow up note:', e);
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Navbar title="Customer CRM" />
        {canModify && (
          <button onClick={() => openFormModal(null)} className="btn btn-primary">
            <Plus size={18} />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* Filter and search bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div className="table-controls" style={{ margin: 0 }}>
          <div className="search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, business, email, phone..."
              className="form-input search-input"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <select
              className="form-input"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer list table */}
      <div className="card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>No customers found.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Business Name</th>
                    <th>Mobile</th>
                    <th>Email</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Follow-up Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.businessName}</td>
                      <td>{c.mobile}</td>
                      <td>{c.email}</td>
                      <td>
                        <span className="badge badge-info">{c.customerType}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          c.status === 'ACTIVE' ? 'badge-success' : 
                          c.status === 'LEAD' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {c.followUpDate ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} style={{ color: 'var(--primary)' }} />
                            {new Date(c.followUpDate).toLocaleDateString()}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px' }}
                            title="View details & follow ups"
                          >
                            <Eye size={16} />
                          </button>
                          {canModify && (
                            <button
                              onClick={() => openFormModal(c)}
                              className="btn btn-secondary"
                              style={{ padding: '6px 10px' }}
                              title="Edit Customer"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                        </div>
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
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalItems} customers)
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

      {/* Customer Form Modal (Add/Edit) */}
      {showFormModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{formCustomer ? 'Edit Customer' : 'Add New Customer'}</h2>
              <button onClick={() => setShowFormModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                  {formErrors.name && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.name[0]}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    required
                  />
                  {formErrors.businessName && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.businessName[0]}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                  />
                  {formErrors.mobile && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.mobile[0]}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                  {formErrors.email && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.email[0]}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">GST Number (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 29AAAAA1111A1Z1"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Customer Type</label>
                  <select
                    className="form-input"
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Next Follow-up Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ resize: 'vertical' }}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
                {formErrors.address && <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>{formErrors.address[0]}</span>}
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="form-label">Initial Notes</label>
                <textarea
                  className="form-input"
                  rows={2}
                  style={{ resize: 'vertical' }}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowFormModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Slide-out Drawer */}
      {selectedCustomerId && (
        <>
          <div className="drawer-overlay" onClick={() => setSelectedCustomerId(null)} />
          <div className="drawer">
            <div className="drawer-header">
              <h2 className="modal-title">Customer Profile</h2>
              <button onClick={() => setSelectedCustomerId(null)} className="modal-close">
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {!customerDetail ? (
                <p>Loading profile details...</p>
              ) : (
                <>
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{customerDetail.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <Building size={14} />
                      {customerDetail.businessName}
                    </p>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <span className="badge badge-info">{customerDetail.customerType}</span>
                      <span className={`badge ${
                        customerDetail.status === 'ACTIVE' ? 'badge-success' : 
                        customerDetail.status === 'LEAD' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {customerDetail.status}
                      </span>
                    </div>
                  </div>

                  {/* Profile Contact Info Grid */}
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} /> Mobile
                      </span>
                      <span className="info-value">{customerDetail.mobile}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} /> Email
                      </span>
                      <span className="info-value" style={{ wordBreak: 'break-all' }}>{customerDetail.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">GSTIN</span>
                      <span className="info-value">{customerDetail.gstNumber || 'Not provided'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={12} /> Next Follow-up
                      </span>
                      <span className="info-value">
                        {customerDetail.followUpDate ? new Date(customerDetail.followUpDate).toLocaleDateString() : 'No date set'}
                      </span>
                    </div>
                  </div>

                  <div className="info-item" style={{ marginBottom: '20px' }}>
                    <span className="info-label">Shipping / Billing Address</span>
                    <span className="info-value" style={{ fontWeight: 400, fontSize: '0.9rem' }}>{customerDetail.address}</span>
                  </div>

                  {customerDetail.notes && (
                    <div className="info-item" style={{ marginBottom: '24px', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span className="info-label">General Description / Notes</span>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{customerDetail.notes}</p>
                    </div>
                  )}

                  {/* CRM Follow-ups Section */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Follow-up Activity Notes</h4>

                    {canModify && (
                      <form onSubmit={handleAddNote} style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Add action or contact note..."
                            className="form-input"
                            style={{ flex: 1, padding: '8px 12px', fontSize: '0.9rem' }}
                            value={newFollowUpNote}
                            onChange={(e) => setNewFollowUpNote(e.target.value)}
                            required
                          />
                          <button 
                            type="submit" 
                            className="btn btn-primary"
                            style={{ padding: '8px 14px' }}
                            disabled={submittingNote}
                          >
                            <PlusCircle size={16} />
                            <span>Add</span>
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="notes-timeline">
                      {customerDetail.followUps.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity logged yet.</p>
                      ) : (
                        customerDetail.followUps.map((f: any) => (
                          <div key={f.id} className="note-item">
                            <div className="note-header">
                              <span className="note-author">{f.createdBy.name} ({f.createdBy.role})</span>
                              <span>{new Date(f.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="note-text">{f.note}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Past Challans list */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px' }}>Sales Transactions ({customerDetail.challans.length})</h4>
                    {customerDetail.challans.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No sales challans recorded.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {customerDetail.challans.map((ch: any) => (
                          <div key={ch.id} style={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.15)',
                            padding: '10px 14px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.85rem'
                          }}>
                            <div>
                              <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{ch.challanNumber}</span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '10px' }}>
                                {new Date(ch.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span>{ch.totalQuantity} items</span>
                              <span className={`badge ${
                                ch.status === 'CONFIRMED' ? 'badge-success' : 
                                ch.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                              }`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                {ch.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Customers;
