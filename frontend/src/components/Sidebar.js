'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import styles from './sidebar.module.css';
import {
  DashboardIcon,
  ProductIcon,
  InventoryIcon,
  TransactionIcon,
  OrderIcon,
  ReturnIcon,
  AuditIcon,
  LogIcon,
  XIcon,
} from './Icons';

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
    { name: 'Products', href: '/products', icon: ProductIcon, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
    { name: 'Inventory', href: '/inventory', icon: InventoryIcon, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
    { name: 'Transactions', href: '/transactions', icon: TransactionIcon, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
    { name: 'Orders', href: '/orders', icon: OrderIcon, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
    { name: 'Returns', href: '/returns', icon: ReturnIcon, roles: ['Admin', 'Warehouse Manager', 'Staff'] },
    { name: 'Stock Audits', href: '/audits', icon: AuditIcon, roles: ['Admin', 'Warehouse Manager'] },
    { name: 'Audit Logs', href: '/logs', icon: LogIcon, roles: ['Admin'] },
  ];

  if (!user) return null;

  // Filter links by user role
  const allowedLinks = links.filter((link) => link.roles.includes(user.role));

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.logoArea}>
        <div className={styles.brandWrapper}>
          <img
            src="/logo.png"
            alt="White Wings Logo"
            className={styles.logoImage}
          />
          <span className={styles.logoSub}>INVENTORY v1.0</span>
        </div>
        <button className={styles.mobileCloseBtn} onClick={onClose} aria-label="Close Navigation">
          <XIcon size={20} />
        </button>
      </div>

      <nav className={styles.navigation}>
        {allowedLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`${styles.navLink} ${isActive ? styles.activeNavLink : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className={styles.profileArea}>
        <div className={styles.avatar}>{getInitials(user.name)}</div>
        <div className={styles.userMeta}>
          <span className={styles.userName}>{user.name}</span>
          <span className={styles.userRole}>{user.role}</span>
        </div>
      </div>
    </div>
  );
}
