'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Portal from '../../components/Portal';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import styles from '../products/products.module.css'; // sharing layouts, tables, and modal styles
import { SearchIcon, PlusIcon, XIcon } from '../../components/Icons';

export default function ReturnsPage() {
  const { user } = useAuth();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);

  // Create Return Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  
  // Fields
  const [orderNumber, setOrderNumber] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('Defective');

  // Process Modal
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [actionTaken, setActionTaken] = useState('');
  const [processError, setProcessError] = useState('');

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError('');
      let query = `/returns?page=${page}&limit=8`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (status) query += `&status=${encodeURIComponent(status)}`;

      const res = await api.get(query);
      if (res.success) {
        setReturns(res.data);
        setTotalPages(res.pagination.pages);
        setTotalReturns(res.pagination.total);
      } else {
        setError('Failed to fetch returns logs');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching returns logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [page, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReturns();
  };

  const openCreateModal = async () => {
    setOrderNumber('');
    setProductId('');
    setQuantity('1');
    setReason('Defective');
    setModalError('');
    setShowCreateModal(true);

    try {
      setModalLoading(true);
      const res = await api.get('/products?page=1&limit=100');
      if (res.success) {
        setProductsList(res.data);
        if (res.data.length > 0) {
          setProductId(res.data[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
      setModalError('Failed to load products: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveReturn = async (e) => {
    e.preventDefault();
    if (!orderNumber || !productId || !quantity || !reason) {
      setModalError('Please fill in all fields');
      return;
    }

    try {
      setModalLoading(true);
      setModalError('');

      const payload = {
        orderNumber,
        productId,
        quantity: Number(quantity),
        reason,
      };

      const res = await api.post('/returns', payload);
      if (res.success) {
        setShowCreateModal(false);
        fetchReturns();
      } else {
        setModalError(res.message || 'Failed to file return');
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Failed to file return');
    } finally {
      setModalLoading(false);
    }
  };

  const openProcessModal = (retItem) => {
    setSelectedReturn(retItem);
    setActionTaken('');
    setProcessError('');
    setShowProcessModal(true);
  };

  const handleProcessReturn = async (finalStatus) => {
    if (!selectedReturn) return;

    try {
      setModalLoading(true);
      setProcessError('');

      const res = await api.put(`/returns/${selectedReturn._id}/process`, {
        status: finalStatus,
        actionTaken: actionTaken || `Processed return as ${finalStatus}`,
      });

      if (res.success) {
        setShowProcessModal(false);
        fetchReturns();
      } else {
        setProcessError(res.message || 'Failed to process return');
      }
    } catch (err) {
      console.error(err);
      setProcessError(err.message || 'Failed to process return');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (retStatus) => {
    switch (retStatus) {
      case 'Pending Approval':
        return <span className="badge badge-warning">Pending Approval</span>;
      case 'Approved & Restocked':
        return <span className="badge badge-success">Approved & Restocked</span>;
      case 'Scrapped':
        return <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Approved & Scrapped</span>;
      case 'Rejected':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-secondary">{retStatus}</span>;
    }
  };

  const isRestricted = !user || !['Admin', 'Warehouse Manager'].includes(user.role);

  return (
    <Layout>
      <div className={styles.toolbar}>
        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className={styles.filters}>
          <div className="relative" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by return #, order # or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <SearchIcon size={16} />
            </span>
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{ width: '200px' }}
          >
            <option value="">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Approved & Restocked">Approved & Restocked</option>
            <option value="Scrapped">Approved & Scrapped</option>
            <option value="Rejected">Rejected</option>
          </select>
        </form>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <PlusIcon size={16} /> File Product Return
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', color: 'var(--danger)', background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Main Table */}
      <div className={`${styles.tableContainer} glass-panel`}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : returns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No return requests logged.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Return #</th>
                <th>Order #</th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Processed By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((ret) => (
                <tr key={ret._id}>
                  <td>
                    <span className={styles.skuCode}>{ret.returnNumber}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{ret.orderNumber}</td>
                  <td>{ret.product?.sku || 'N/A'}</td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ret.product?.name || 'Deleted Product'}</td>
                  <td style={{ fontWeight: 700 }}>{ret.quantity} units</td>
                  <td style={{ fontSize: '0.85rem' }}>{ret.reason}</td>
                  <td>{getStatusBadge(ret.status)}</td>
                  <td style={{ fontSize: '0.85rem' }}>{ret.processedBy?.name || 'Pending'}</td>
                  <td>
                    {ret.status === 'Pending Approval' ? (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => openProcessModal(ret)}
                        disabled={isRestricted}
                        title={isRestricted ? 'Requires Manager permission' : 'Process return request'}
                      >
                        Process
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Showing {returns.length} of {totalReturns} returns
          </span>
          <div className={styles.paginationBtns}>
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </button>
            <span className="flex-center" style={{ padding: '0 1rem', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* File Return Modal */}
      {showCreateModal && (
        <Portal>
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowCreateModal(false);
            }}
          >
            <div className={`${styles.modalContent} glass-panel`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>File Customer Product Return</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>
                <XIcon size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveReturn}>
              {/* Order number */}
              <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                <label className={styles.inputLabel}>Original Order Number *</label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. ORD-88931"
                  required
                  disabled={modalLoading}
                />
              </div>

              {/* Select Product */}
              <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                <label className={styles.inputLabel}>Product Returned *</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                  disabled={modalLoading}
                >
                  {productsList.length === 0 && <option value="">No products registered yet</option>}
                  {productsList.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGrid}>
                {/* Quantity */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Quantity Returned *</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="1"
                    required
                    disabled={modalLoading}
                  />
                </div>

                {/* Reason */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Reason for Return *</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    disabled={modalLoading}
                  >
                    <option value="Defective">Defective / Malfunctioning</option>
                    <option value="Damaged">Damaged in Shipment</option>
                    <option value="Exchange">Exchange Requested</option>
                    <option value="Customer Remorse">Customer Remorse / Cancelled</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                  {modalLoading ? <div className="loading-spinner"></div> : 'File Return Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}

      {/* Process Return Action Modal */}
      {showProcessModal && selectedReturn && (
        <Portal>
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowProcessModal(false);
            }}
          >
            <div className={`${styles.modalContent} glass-panel`} style={{ maxWidth: '440px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Process Return: {selectedReturn.returnNumber}</h3>
              <button className={styles.closeBtn} onClick={() => setShowProcessModal(false)}>
                <XIcon size={20} />
              </button>
            </div>

            {processError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {processError}
              </div>
            )}

            <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
              <label className={styles.inputLabel}>Action Taken / Resolution Notes</label>
              <textarea
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="e.g. Inspected items. Placed back in Aisle 4, shelf A. OR Defective, sent to scrap pile."
                rows="3"
                disabled={modalLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--success)' }}
                onClick={() => handleProcessReturn('Approved & Restocked')}
                disabled={modalLoading}
              >
                {modalLoading ? <div className="loading-spinner"></div> : 'Approve & Restock Inventory'}
              </button>

              <button
                className="btn btn-primary"
                style={{ background: '#7c2d12', color: '#fdba74', borderColor: '#9a3412' }}
                onClick={() => handleProcessReturn('Scrapped')}
                disabled={modalLoading}
              >
                {modalLoading ? <div className="loading-spinner"></div> : 'Approve & Dispose (Scrapped)'}
              </button>

              <button
                className="btn btn-danger"
                style={{ background: 'transparent', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}
                onClick={() => handleProcessReturn('Rejected')}
                disabled={modalLoading}
              >
                Reject Return Request
              </button>
            </div>
          </div>
        </div>
      </Portal>
      )}
    </Layout>
  );
}
