'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Portal from '../../components/Portal';
import { api } from '../../utils/api';
import styles from './inventory.module.css';
import { SearchIcon, PlusIcon, XIcon } from '../../components/Icons';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Transaction Modal State
  const [showModal, setShowModal] = useState(false);
  const [allProducts, setAllProducts] = useState([]); // List for dropdown selection
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [formData, setFormData] = useState({
    productId: '',
    type: 'In',
    quantity: '1',
    reason: '',
    location: '',
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError('');
      let query = `/inventory?page=${page}&limit=8`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (status) query += `&status=${encodeURIComponent(status)}`;

      const res = await api.get(query);
      if (res.success) {
        setInventory(res.data);
        setTotalPages(res.pagination.pages);
        setTotalItems(res.pagination.total);
      } else {
        setError('Failed to fetch inventory levels');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching inventory levels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInventory();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openTransactionModal = async () => {
    setFormData({
      productId: '',
      type: 'In',
      quantity: '1',
      reason: '',
      location: '',
    });
    setModalError('');
    setShowModal(true);

    // Fetch all products to populate selection dropdown
    try {
      setModalLoading(true);
      const res = await api.get('/products?page=1&limit=100'); // fetch a batch of products
      if (res.success) {
        setAllProducts(res.data);
        if (res.data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            productId: res.data[0]._id,
            location: res.data[0].inventory?.location || 'Receiving Dock',
          }));
        }
      }
    } catch (err) {
      console.error(err);
      setModalError('Failed to fetch product listings: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  // Auto-populate location based on product selection
  useEffect(() => {
    if (formData.productId && allProducts.length > 0) {
      const selected = allProducts.find((p) => p._id === formData.productId);
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          location: selected.inventory?.location || 'Receiving Dock',
        }));
      }
    }
  }, [formData.productId, allProducts]);

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.type || !formData.quantity || !formData.reason) {
      setModalError('Please fill in all required fields');
      return;
    }

    try {
      setModalError('');
      setModalLoading(true);
      
      const payload = {
        ...formData,
        quantity: Number(formData.quantity),
      };

      const res = await api.post('/inventory/transaction', payload);
      if (res.success) {
        setShowModal(false);
        fetchInventory(); // Reload list
      } else {
        setModalError(res.message || 'Transaction failed');
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Transaction failed');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (itemStatus) => {
    switch (itemStatus) {
      case 'In Stock':
        return <span className="badge badge-success">In Stock</span>;
      case 'Low Stock':
        return <span className="badge badge-warning">Low Stock</span>;
      case 'Out of Stock':
        return <span className="badge badge-danger">Out of Stock</span>;
      default:
        return <span className="badge badge-secondary">{itemStatus}</span>;
    }
  };

  return (
    <Layout>
      <div className={styles.toolbar}>
        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className={styles.filters}>
          <div className="relative" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by product name, SKU, or location..."
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
            style={{ width: '180px' }}
          >
            <option value="">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </form>

        {/* Action Button */}
        <button className="btn btn-primary" onClick={openTransactionModal}>
          <PlusIcon size={16} /> Log Stock Transaction
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
        ) : inventory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No stock levels found.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Warehouse Location</th>
                <th>Current Stock</th>
                <th>Reorder Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.status === 'Low Stock';
                const isOut = item.status === 'Out of Stock';
                const rowClass = isOut ? styles.outOfStockRow : (isLow ? styles.lowStockRow : '');

                return (
                  <tr key={item._id} className={rowClass}>
                    <td>
                      <span className={styles.skuCode}>{item.product.sku}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.product.name}</td>
                    <td>{item.product.category}</td>
                    <td style={{ fontWeight: 500 }}>{item.location}</td>
                    <td style={{ fontWeight: 700, fontSize: '1rem', color: isOut ? 'var(--danger)' : (isLow ? 'var(--warning)' : 'var(--text-primary)') }}>
                      {item.quantity} units
                    </td>
                    <td>{item.reorderPoint} units</td>
                    <td>{getStatusBadge(item.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <span className={styles.paginationInfo}>
            Showing {inventory.length} of {totalItems} items
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

      {/* Stock Adjustment Modal */}
      {showModal && (
        <Portal>
          <div
            className={styles.modalOverlay}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowModal(false);
            }}
          >
            <div className={`${styles.modalContent} glass-panel`}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>New Stock Transaction (In / Out)</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <XIcon size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            {modalLoading && allProducts.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <div className="loading-spinner"></div>
              </div>
            ) : (
              <form onSubmit={handleSaveTransaction}>
                {/* Select Product */}
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Product *</label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleInputChange}
                    required
                    disabled={modalLoading}
                  >
                    {allProducts.length === 0 && <option value="">No products registered yet</option>}
                    {allProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.sku}) - Stock: {p.inventory?.quantity || 0}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction Type */}
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Movement Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    disabled={modalLoading}
                  >
                    <option value="In">Stock In (Purchase/Inbound/Restock)</option>
                    <option value="Out">Stock Out (Shipment/Sales/Write-off)</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Quantity (units) *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                    disabled={modalLoading}
                  />
                </div>

                {/* New/Target Location */}
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Location (Aisle/Bin)</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Aisle 4, Shelf B2"
                    disabled={modalLoading}
                  />
                </div>

                {/* Reason */}
                <div className={styles.formGroup}>
                  <label className={styles.inputLabel}>Reason / Notes *</label>
                  <input
                    type="text"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    placeholder="e.g. Restocking printer papers, Supplier batch 4"
                    required
                    disabled={modalLoading}
                  />
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={modalLoading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={modalLoading}>
                    {modalLoading ? <div className="loading-spinner"></div> : 'Submit Transaction'}
                  </button>
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
