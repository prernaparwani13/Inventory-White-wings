'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';
import { api } from '../utils/api';
import styles from './header.module.css';
import { SunIcon, MoonIcon, BellIcon } from './Icons';

export default function Header({ onMenuToggle }) {
  const { logout, theme, toggleTheme } = useAuth();
  const pathname = usePathname();
  const [alerts, setAlerts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Derive page title
  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard':
        return 'System Overview Dashboard';
      case '/products':
        return 'Product Management & SKU Catalog';
      case '/inventory':
        return 'Real-Time Inventory Levels';
      case '/transactions':
        return 'Stock Transaction History';
      case '/orders':
        return 'Order Processing & Tracking';
      case '/returns':
        return 'Returns Management Center';
      case '/audits':
        return 'Stock Take & Reconciliation';
      case '/logs':
        return 'System Audit & Activity Logs';
      default:
        return 'Inventory Control System';
    }
  };

  // Fetch low stock items for alerts dropdown
  useEffect(() => {
    const fetchLowStockAlerts = async () => {
      try {
        const res = await api.get('/inventory/low-stock');
        if (res.success) {
          setAlerts(res.data);
        }
      } catch (err) {
        console.error('Failed to load low stock alerts for header:', err.message);
      }
    };

    fetchLowStockAlerts();
    // Poll every 30s
    const interval = setInterval(fetchLowStockAlerts, 30000);
    return () => clearInterval(interval);
  }, [pathname]); // Refresh alerts when page changes

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.titleArea}>
        <button className={styles.menuButton} onClick={onMenuToggle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <h1 className={styles.pageTitle}>{getPageTitle()}</h1>
      </div>

      <div className={styles.actionsArea}>
        {/* Theme Toggle */}
        <button className={styles.iconButton} onClick={toggleTheme} title="Toggle Dark/Light Mode">
          {theme === 'dark' ? <SunIcon size={20} /> : <MoonIcon size={20} />}
        </button>

        {/* Notifications Icon & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            className={styles.iconButton}
            onClick={() => setShowDropdown(!showDropdown)}
            title="Low Stock Alerts"
          >
            <BellIcon size={20} />
            {alerts.length > 0 && (
              <span className={styles.notificationBadge}>{alerts.length}</span>
            )}
          </button>

          {showDropdown && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownTitle}>
                Low Stock Alerts ({alerts.length})
              </div>
              <div className={styles.dropdownList}>
                {alerts.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0.5rem' }}>
                    All product levels are optimal.
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div key={alert._id} className={styles.dropdownItem}>
                      <span className={styles.alertName}>{alert.product.name}</span>
                      <span className={styles.alertDetail}>
                        <span>SKU: {alert.product.sku}</span>
                        <span style={{ color: alert.quantity === 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600 }}>
                          Qty: {alert.quantity} (Min: {alert.reorderPoint})
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <button className={styles.logoutBtn} onClick={logout}>
          Sign Out
        </button>
      </div>
    </header>
  );
}
