'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import styles from './layout.module.css';

export default function Layout({ children }) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className="loading-spinner" style={{ width: '3rem', height: '3rem' }}></div>
        <div className={styles.loadingText}>AUTHENTICATING SECURE CONNECTION...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Let AuthContext handle redirect to login
  }

  return (
    <div className={styles.wrapper}>
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.mainContent}>
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className={styles.pageBody}>
          {children}
        </main>
      </div>
    </div>
  );
}
