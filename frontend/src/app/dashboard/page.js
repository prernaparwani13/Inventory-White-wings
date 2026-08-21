'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../utils/api';
import styles from './dashboard.module.css';
import {
  ProductIcon,
  InventoryIcon,
  OrderIcon,
  ReturnIcon,
} from '../../components/Icons';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/reports/dashboard');
        if (res.success) {
          setStats(res.data);
        } else {
          setError('Failed to fetch dashboard statistics');
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error connecting to the API');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val || 0);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="loading-spinner" style={{ width: '3rem', height: '3rem' }}></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--danger-border)' }}>
          <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Data Sync Error</h3>
          <p>{error}</p>
          <button className="btn btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => window.location.reload()}>
            Retry Sync
          </button>
        </div>
      </Layout>
    );
  }

  const {
    totalProducts,
    totalQty,
    totalValue,
    lowStockCount,
    deliveredOrdersCount,
    totalRevenue,
    totalReturnsCount,
    recentLogs,
    categoryDistribution,
  } = stats || {};

  return (
    <Layout>
      <div className={styles.statsGrid}>
        {/* Total Products */}
        <div className={`${styles.statCard} glass-panel`}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Unique Products</span>
            <span className={styles.statValue}>{totalProducts || 0}</span>
          </div>
          <div className={`${styles.statIcon} ${styles.iconPrimary}`}>
            <ProductIcon size={24} />
          </div>
        </div>

        {/* Total Quantity */}
        <div className={`${styles.statCard} glass-panel`}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Stock Items</span>
            <span className={styles.statValue}>{totalQty || 0}</span>
          </div>
          <div className={`${styles.statIcon} ${styles.iconSuccess}`}>
            <InventoryIcon size={24} />
          </div>
        </div>

        {/* Valuation */}
        <div className={`${styles.statCard} glass-panel`}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Valuation</span>
            <span className={styles.statValue} style={{ fontSize: '1.5rem' }}>{formatCurrency(totalValue)}</span>
          </div>
          <div className={`${styles.statIcon} ${styles.iconPrimary}`}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>$</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`${styles.statCard} glass-panel`} style={{ borderColor: lowStockCount > 0 ? 'var(--warning-border)' : 'var(--border-glass)' }}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Low Stock Alerts</span>
            <span className={styles.statValue} style={{ color: lowStockCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {lowStockCount || 0}
            </span>
          </div>
          <div className={`${styles.statIcon} ${lowStockCount > 0 ? styles.iconWarning : styles.iconPrimary}`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </div>

        {/* Fulfillments */}
        <div className={`${styles.statCard} glass-panel`}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Delivered Orders</span>
            <span className={styles.statValue}>{deliveredOrdersCount || 0}</span>
          </div>
          <div className={`${styles.statIcon} ${styles.iconSuccess}`}>
            <OrderIcon size={24} />
          </div>
        </div>

        {/* Returns */}
        <div className={`${styles.statCard} glass-panel`} style={{ borderColor: totalReturnsCount > 0 ? 'var(--danger-border)' : 'var(--border-glass)' }}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Processed Returns</span>
            <span className={styles.statValue} style={{ color: totalReturnsCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
              {totalReturnsCount || 0}
            </span>
          </div>
          <div className={`${styles.statIcon} ${totalReturnsCount > 0 ? styles.iconDanger : styles.iconPrimary}`}>
            <ReturnIcon size={24} />
          </div>
        </div>
      </div>

      <div className={styles.dashboardLayout}>
        {/* System Activity Log */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className={styles.widgetTitle}>Recent Security & Activity Logs</h3>
          <div className={styles.logList}>
            {recentLogs && recentLogs.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No activities logged yet.</p>
            ) : (
              recentLogs?.map((log) => (
                <div key={log._id} className={styles.logItem}>
                  <div className={styles.logHeader}>
                    <span className={styles.logAction}>{log.action}</span>
                    <span className={styles.logTime}>{formatTime(log.createdAt)}</span>
                  </div>
                  <div className={styles.logDetails}>{log.details}</div>
                  <div className={styles.logUser}>Performed by: {log.userName || 'System'} (IP: {log.ipAddress})</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Product Category Stock Distribution */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 className={styles.widgetTitle}>Category Distribution</h3>
          <div className={styles.categoryList}>
            {categoryDistribution && categoryDistribution.length === 0 ? (
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No categories found.</p>
            ) : (
              categoryDistribution?.map((cat) => {
                // Calculate percentage out of total products
                const percentage = Math.round((cat.count / (totalProducts || 1)) * 100);
                return (
                  <div key={cat.category} className={styles.categoryItem}>
                    <div className={styles.categoryInfo}>
                      <span className={styles.categoryName}>{cat.category}</span>
                      <span className={styles.categoryCount}>
                        {cat.count} items ({percentage}%)
                      </span>
                    </div>
                    <div className={styles.progressBarContainer}>
                      <div className={styles.progressBar} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
