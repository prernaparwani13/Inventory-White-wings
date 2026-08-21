'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.message || 'Failed to authenticate');
    }
  };

  const handleQuickLogin = async (roleName, defaultEmail, defaultPassword, defaultFullName) => {
    setError('');
    setIsSubmitting(true);
    
    // 1. Try to login
    let res = await login(defaultEmail, defaultPassword);
    
    // 2. If it fails, check if the backend is down
    if (!res.success) {
      if (res.message === 'Failed to fetch') {
        setError('Connection to backend failed. Make sure the backend is running (run "npm run dev" in the backend directory).');
        setIsSubmitting(false);
        return;
      }

      // 3. Try to auto-register if the user just doesn't exist
      try {
        const regResponse = await fetch('http://localhost:5000/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: defaultFullName,
            email: defaultEmail,
            password: defaultPassword,
            role: roleName,
          }),
        });
        
        const regJson = await regResponse.json();
        
        if (regJson.success) {
          // Retry login
          res = await login(defaultEmail, defaultPassword);
        } else {
          setError(regJson.message || 'Auto-registration failed');
        }
      } catch (err) {
        console.error('Auto-registration error:', err);
        setError('Connection to backend failed. Make sure the backend is running.');
      }
    }

    setIsSubmitting(false);
    if (res && !res.success) {
      setError(res.message === 'Failed to fetch' 
        ? 'Connection to backend failed. Make sure the backend is running.' 
        : (res.message || 'Login failed')
      );
    }
  };

  return (
    <div className={styles.container}>
      <div className={`${styles.loginCard} glass-panel`}>
        <div className={styles.titleArea}>
          <img
            src="/logo.png"
            alt="White Wings Logo"
            className={styles.loginLogo}
          />
          <p className={styles.subtitle}>Inventory Management Platform</p>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@whitewings.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="loading-spinner"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className={styles.quickLoginSection}>
          <div className={styles.quickLoginTitle}>Quick Access Testing Accounts</div>
          <div className={styles.quickLoginGrid}>
            <button
              onClick={() => handleQuickLogin('Admin', 'admin@whitewings.com', 'admin123', 'John Doe (Admin)')}
              className={styles.quickLoginBtn}
              disabled={isSubmitting}
            >
              <span>John Doe</span>
              <span className={styles.quickRole}>Admin</span>
            </button>
            
            <button
              onClick={() => handleQuickLogin('Warehouse Manager', 'manager@whitewings.com', 'manager123', 'Alice Smith (Manager)')}
              className={styles.quickLoginBtn}
              disabled={isSubmitting}
            >
              <span>Alice Smith</span>
              <span className={styles.quickRole}>Warehouse Manager</span>
            </button>
            
            <button
              onClick={() => handleQuickLogin('Staff', 'staff@whitewings.com', 'staff123', 'Bob Johnson (Staff)')}
              className={styles.quickLoginBtn}
              disabled={isSubmitting}
            >
              <span>Bob Johnson</span>
              <span className={styles.quickRole}>Staff</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
