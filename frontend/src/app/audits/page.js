'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Portal from '../../components/Portal';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import styles from '../products/products.module.css'; // sharing layouts, tables, and modal styles
import { PlusIcon, XIcon, InfoIcon, CheckIcon } from '../../components/Icons';

export default function AuditsPage() {
  const { user } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAudits, setTotalAudits] = useState(0);

  // Audit Detail Modal
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [auditItems, setAuditItems] = useState([]); // local array to edit counts
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchAudits = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/audits?page=${page}&limit=8`);
      if (res.success) {
        setAudits(res.data);
        setTotalPages(res.pagination.pages);
        setTotalAudits(res.pagination.total);
      } else {
        setError('Failed to fetch audits');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching audits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, [page]);

  const handleInitiateAudit = async () => {
    if (!confirm('Initiating a new stock audit will capture the CURRENT quantities of all warehouse products. Proceed?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.post('/audits', { productIds: [] }); // Empty array audits all products
      if (res.success) {
        fetchAudits();
      } else {
        setError(res.message || 'Failed to start audit');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to start audit');
    } finally {
      setLoading(false);
    }
  };

  const openDetailModal = async (audit) => {
    setSelectedAudit(audit);
    setAuditItems([]);
    setModalError('');
    setShowDetailModal(true);

    try {
      setModalLoading(true);
      const res = await api.get(`/audits/${audit._id}`);
      if (res.success) {
        setAuditItems(res.data.items.map(item => ({
          productId: item.product?._id,
          sku: item.product?.sku || 'N/A',
          name: item.product?.name || 'Deleted Product',
          expectedQty: item.expectedQty,
          actualQty: item.actualQty, // editable
          remarks: item.remarks || '', // editable
        })));
      }
    } catch (err) {
      console.error(err);
      setModalError('Failed to load audit items: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCountChange = (productId, field, value) => {
    setAuditItems(prev =>
      prev.map(item => {
        if (item.productId !== productId) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const handleReconcileSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAudit) return;

    if (!confirm('Reconciling the audit will ADJUST the inventory database quantities to match your physical counts, and write transaction logs. This action CANNOT be undone. Proceed?')) {
      return;
    }

    try {
      setModalLoading(true);
      setModalError('');

      const counts = auditItems.map(item => ({
        productId: item.productId,
        actualQty: Number(item.actualQty),
        remarks: item.remarks,
      }));

      const res = await api.put(`/audits/${selectedAudit._id}/reconcile`, { counts });
      if (res.success) {
        setShowDetailModal(false);
        fetchAudits();
      } else {
        setModalError(res.message || 'Reconciliation failed');
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Reconciliation failed');
    } finally {
      setModalLoading(false);
    }
  };

  const isRestricted = !user || !['Admin', 'Warehouse Manager'].includes(user.role);

  return (
    <Layout>
      <div className={styles.toolbar} style={{ justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleInitiateAudit}
          disabled={isRestricted}
          title={isRestricted ? 'Requires Manager permissions' : 'Capture stock levels & start audit'}
        >
          <PlusIcon size={16} /> Initiate New Stock Take
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
        ) : audits.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No audits initiated yet.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Audit #</th>
                <th>Date Initiated</th>
                <th>Audited Items</th>
                <th>Status</th>
                <th>Audited By</th>
                <th>Date Reconciled</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit._id}>
                  <td>
                    <span className={styles.skuCode}>{audit.auditNumber}</span>
                  </td>
                  <td>{new Date(audit.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{audit.items?.length || 0} Products</td>
                  <td>
                    {audit.status === 'Reconciled' ? (
                      <span className="badge badge-success">Reconciled</span>
                    ) : (
                      <span className="badge badge-warning">Draft (In Progress)</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{audit.auditedBy?.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{audit.auditedBy?.role}</span>
                    </div>
                  </td>
                  <td>{audit.reconciledAt ? new Date(audit.reconciledAt).toLocaleDateString() : 'Pending'}</td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      onClick={() => openDetailModal(audit)}
                    >
                      {audit.status === 'Reconciled' ? 'View Details' : 'Enter Counts'}
                    </button>
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
            Showing {audits.length} of {totalAudits} audits
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

      {/* Audit Detail & Entry Modal */}
      {showDetailModal && selectedAudit && (
        <Portal>
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowDetailModal(false);
            }}
          >
            <div className={`${styles.modalContent} glass-panel`} style={{ maxWidth: '800px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Stock Take Count Sheet: {selectedAudit.auditNumber} ({selectedAudit.status})
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowDetailModal(false)}>
                <XIcon size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            {modalLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <form onSubmit={handleReconcileSubmit}>
                {selectedAudit.status === 'Draft' && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <InfoIcon size={20} style={{ color: '#3b82f6', marginTop: '0.1rem' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Enter physical inventory counts below. Any discrepancy compared to expected stock levels will trigger an inventory correction transaction.
                    </p>
                  </div>
                )}

                <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: '1px solid var(--border-glass)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  <table className={styles.table} style={{ fontSize: '0.85rem', minWidth: '580px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.1)' }}>
                        <th style={{ padding: '0.75rem' }}>SKU</th>
                        <th style={{ padding: '0.75rem' }}>Product Name</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Expected (db)</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Physical Count</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Variance</th>
                        <th style={{ padding: '0.75rem' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditItems.map((item) => {
                        const variance = Number(item.actualQty) - item.expectedQty;
                        const isDraft = selectedAudit.status === 'Draft';
                        
                        return (
                          <tr key={item.productId}>
                            <td style={{ padding: '0.75rem' }} className={styles.skuCode}>{item.sku}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{item.name}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>
                              {item.expectedQty}
                            </td>
                            <td style={{ padding: '0.5rem', width: '120px', textAlign: 'center' }}>
                              {isDraft ? (
                                <input
                                  type="number"
                                  value={item.actualQty}
                                  onChange={(e) => handleCountChange(item.productId, 'actualQty', e.target.value)}
                                  style={{ padding: '0.35rem', textAlign: 'center', borderRadius: '4px' }}
                                  min="0"
                                  required
                                  disabled={modalLoading}
                                />
                              ) : (
                                <strong>{item.actualQty}</strong>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>
                              {variance === 0 ? (
                                <span style={{ color: 'var(--text-muted)' }}>0</span>
                              ) : variance > 0 ? (
                                <span style={{ color: 'var(--success)' }}>+{variance}</span>
                              ) : (
                                <span style={{ color: 'var(--danger)' }}>{variance}</span>
                              )}
                            </td>
                            <td style={{ padding: '0.5rem' }}>
                              {isDraft ? (
                                <input
                                  type="text"
                                  value={item.remarks}
                                  onChange={(e) => handleCountChange(item.productId, 'remarks', e.target.value)}
                                  placeholder="Notes..."
                                  style={{ padding: '0.35rem', borderRadius: '4px' }}
                                  disabled={modalLoading}
                                />
                              ) : (
                                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>{item.remarks || '-'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowDetailModal(false)}
                    disabled={modalLoading}
                  >
                    Close
                  </button>
                  {selectedAudit.status === 'Draft' && (
                    <button type="submit" className="btn btn-primary" disabled={modalLoading || isRestricted}>
                      {modalLoading ? <div className="loading-spinner"></div> : <><CheckIcon size={16} /> Reconcile & Correct Stock</>}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </Portal>
      )}
    </Layout>
  );
}
