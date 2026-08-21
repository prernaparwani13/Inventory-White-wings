'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../utils/api';
import styles from '../inventory/inventory.module.css'; // sharing layouts and tables styles
import { SearchIcon } from '../../components/Icons';

export default function TransactionsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      let query = `/inventory/transactions?page=${page}&limit=10`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (type) query += `&type=${encodeURIComponent(type)}`;

      const res = await api.get(query);
      if (res.success) {
        setLogs(res.data);
        setTotalPages(res.pagination.pages);
        setTotalItems(res.pagination.total);
      } else {
        setError('Failed to fetch transaction logs');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching transaction logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, type]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getTransactionBadge = (logType) => {
    switch (logType) {
      case 'In':
        return <span className="badge badge-success" style={{ minWidth: '80px', justifyContent: 'center' }}>Inbound</span>;
      case 'Out':
        return <span className="badge badge-danger" style={{ minWidth: '80px', justifyContent: 'center' }}>Outbound</span>;
      case 'Return':
        return <span className="badge badge-success" style={{ minWidth: '80px', justifyContent: 'center', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }}>Return</span>;
      case 'Audit Reconciled':
        return <span className="badge badge-warning" style={{ minWidth: '80px', justifyContent: 'center', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.2)' }}>Reconciliation</span>;
      default:
        return <span className="badge badge-secondary" style={{ minWidth: '80px', justifyContent: 'center' }}>{logType}</span>;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Layout>
      <div className={styles.toolbar}>
        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className={styles.filters}>
          <div className="relative" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <SearchIcon size={16} />
            </span>
          </div>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            style={{ width: '180px' }}
          >
            <option value="">All Types</option>
            <option value="In">Inbound</option>
            <option value="Out">Outbound</option>
            <option value="Return">Return Restock</option>
            <option value="Audit Reconciled">Reconciliation</option>
          </select>
        </form>
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
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No stock transactions recorded.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Type</th>
                <th>Qty Moved</th>
                <th>Stock Delta</th>
                <th>Reason / reference</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatTime(log.createdAt)}</td>
                  <td>
                    <span className={styles.skuCode}>{log.product?.sku || 'UNKNOWN'}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.product?.name || 'Deleted Product'}</td>
                  <td>{getTransactionBadge(log.type)}</td>
                  <td style={{ fontWeight: 700 }}>{log.quantity} units</td>
                  <td style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
                    {log.previousQty} → {log.newQty}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{log.reason}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{log.performedBy?.name || 'System'}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{log.performedBy?.role || ''}</span>
                    </div>
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
            Showing {logs.length} of {totalItems} transactions
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
    </Layout>
  );
}
