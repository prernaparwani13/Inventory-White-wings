'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../utils/api';
import styles from '../inventory/inventory.module.css'; // sharing layouts and table styles

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/reports/audit-logs?page=${page}&limit=12`);
      if (res.success) {
        setLogs(res.data);
        setTotalPages(res.pagination.pages);
        setTotalItems(res.pagination.total);
      } else {
        setError('Failed to fetch system audit logs');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Layout>
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
            No system audit logs found.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Security Action</th>
                <th>Operation Details</th>
                <th>User Identity</th>
                <th>Role</th>
                <th>Origin IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatTime(log.createdAt)}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(59, 130, 246, 0.08)',
                        color: '#3b82f6',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        border: '1px solid rgba(59, 130, 246, 0.15)'
                      }}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{log.details}</td>
                  <td>{log.userName || 'System'}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: log.user?.role === 'Admin' ? 'var(--primary)' : 'var(--text-secondary)' }}>
                      {log.user?.role || 'Guest'}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{log.ipAddress}</td>
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
            Showing {logs.length} of {totalItems} audit logs
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
