'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { api } from '../../utils/api';
import styles from '../products/products.module.css'; // sharing layouts, tables, and modal styles
import { SearchIcon, PlusIcon, XIcon, InfoIcon } from '../../components/Icons';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Create Order Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form Fields
  const [customerName, setCustomerName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [orderItems, setOrderItems] = useState([
    { product: '', quantity: '1', price: 0, available: 0, name: '' },
  ]);

  // Order Details / Process Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusError, setStatusError] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      let query = `/orders?page=${page}&limit=8`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (status) query += `&status=${encodeURIComponent(status)}`;

      const res = await api.get(query);
      if (res.success) {
        setOrders(res.data);
        setTotalPages(res.pagination.pages);
        setTotalOrders(res.pagination.total);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openCreateModal = async () => {
    setCustomerName('');
    setShippingAddress('');
    setOrderItems([{ product: '', quantity: '1', price: 0, available: 0, name: '' }]);
    setModalError('');
    setShowCreateModal(true);

    try {
      setModalLoading(true);
      // Fetch products to choose from
      const res = await api.get('/products?page=1&limit=100');
      if (res.success) {
        setProductsList(res.data);
        // set first product by default for first row
        if (res.data.length > 0) {
          const first = res.data[0];
          setOrderItems([
            {
              product: first._id,
              quantity: '1',
              price: first.price,
              available: first.inventory?.quantity || 0,
              name: first.name,
            },
          ]);
        }
      }
    } catch (err) {
      console.error(err);
      setModalError('Failed to fetch products: ' + err.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddRow = () => {
    if (productsList.length === 0) return;
    const first = productsList[0];
    setOrderItems((prev) => [
      ...prev,
      {
        product: first._id,
        quantity: '1',
        price: first.price,
        available: first.inventory?.quantity || 0,
        name: first.name,
      },
    ]);
  };

  const handleRemoveRow = (index) => {
    if (orderItems.length === 1) return;
    setOrderItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index, field, value) => {
    setOrderItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;

        if (field === 'product') {
          const selected = productsList.find((p) => p._id === value);
          return {
            ...item,
            product: value,
            price: selected ? selected.price : 0,
            available: selected ? (selected.inventory?.quantity || 0) : 0,
            name: selected ? selected.name : '',
          };
        }

        return { ...item, [field]: value };
      })
    );
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  };

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    if (!customerName || !shippingAddress) {
      setModalError('Please fill in customer and shipping info');
      return;
    }

    // Verify stock availability on the frontend
    for (const item of orderItems) {
      if (!item.product) {
        setModalError('Please select a product for all rows');
        return;
      }
      if (Number(item.quantity) > item.available) {
        setModalError(`Insufficient stock for ${item.name}. Available: ${item.available}, Requested: ${item.quantity}`);
        return;
      }
    }

    try {
      setModalLoading(true);
      setModalError('');

      const payload = {
        customerName,
        shippingAddress,
        items: orderItems.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
        })),
      };

      const res = await api.post('/orders', payload);
      if (res.success) {
        setShowCreateModal(false);
        fetchOrders();
      } else {
        setModalError(res.message || 'Failed to place order');
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Failed to place order');
    } finally {
      setModalLoading(false);
    }
  };

  const openStatusModal = (order) => {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setStatusError('');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async (newStatus) => {
    if (!selectedOrder) return;
    
    if (newStatus === 'Shipped' && !trackingNumber) {
      setStatusError('Tracking number is required to ship the order');
      return;
    }

    try {
      setStatusError('');
      setModalLoading(true);
      
      const res = await api.put(`/orders/${selectedOrder._id}/status`, {
        status: newStatus,
        trackingNumber: newStatus === 'Shipped' ? trackingNumber : undefined,
      });

      if (res.success) {
        setShowStatusModal(false);
        fetchOrders();
      } else {
        setStatusError(res.message || 'Failed to update order status');
      }
    } catch (err) {
      console.error(err);
      setStatusError(err.message || 'Failed to update order status');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (orderStatus) => {
    switch (orderStatus) {
      case 'Pending':
        return <span className="badge badge-warning">Pending</span>;
      case 'Shipped':
        return <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' }}>Shipped</span>;
      case 'Delivered':
        return <span className="badge badge-success">Delivered</span>;
      case 'Cancelled':
        return <span className="badge badge-danger">Cancelled</span>;
      default:
        return <span className="badge badge-secondary">{orderStatus}</span>;
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val || 0);
  };

  return (
    <Layout>
      <div className={styles.toolbar}>
        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className={styles.filters}>
          <div className="relative" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by order # or customer..."
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
            <option value="Pending">Pending</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </form>

        <button className="btn btn-primary" onClick={openCreateModal}>
          <PlusIcon size={16} /> Create Sales Order
        </button>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '1rem', color: 'var(--danger)', background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Orders Grid/Table */}
      <div className={`${styles.tableContainer} glass-panel`}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No orders found.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer Name</th>
                <th>Items Ordered</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Tracking #</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id}>
                  <td>
                    <span className={styles.skuCode}>{order.orderNumber}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.customerName}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
                      {order.items.map((item, index) => (
                        <span key={index}>
                          {item.product?.name || 'Deleted Product'} (x{item.quantity})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(order.totalAmount)}</td>
                  <td>{getStatusBadge(order.status)}</td>
                  <td style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    {order.trackingNumber || 'N/A'}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    {order.status !== 'Delivered' && order.status !== 'Cancelled' ? (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                        onClick={() => openStatusModal(order)}
                      >
                        Action
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
            Showing {orders.length} of {totalOrders} orders
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

      {/* Create Sales Order Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`} style={{ maxWidth: '700px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Create New Sales Order</h3>
              <button className={styles.closeBtn} onClick={() => setShowCreateModal(false)}>
                <XIcon size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveOrder}>
              <div className={styles.formGrid}>
                {/* Customer */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Acme Corporation"
                    required
                    disabled={modalLoading}
                  />
                </div>

                {/* Shipping */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Shipping Address *</label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="e.g. 100 Main St, Chicago, IL"
                    required
                    disabled={modalLoading}
                  />
                </div>
              </div>

              {/* Order Items List */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label className={styles.inputLabel} style={{ fontSize: '0.85rem' }}>Line Items</label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    onClick={handleAddRow}
                    disabled={modalLoading || productsList.length === 0}
                  >
                    + Add Item
                  </button>
                </div>

                {orderItems.map((item, idx) => (
                  <div key={idx} className={styles.formGrid} style={{ marginBottom: '0.75rem', alignItems: 'flex-end' }}>
                    {/* Choose Product */}
                    <div className={styles.inputGroup}>
                      <select
                        value={item.product}
                        onChange={(e) => handleRowChange(idx, 'product', e.target.value)}
                        required
                        disabled={modalLoading}
                      >
                        <option value="">-- Choose Product --</option>
                        {productsList.map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name} (${p.price})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity & Stock Availability Check */}
                    <div className={styles.skuInputWrapper}>
                      <div className={styles.inputGroup} style={{ flex: 1 }}>
                        <input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                          min="1"
                          required
                          disabled={modalLoading}
                        />
                      </div>
                      
                      <div className="flex-center" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0 0.5rem', whiteSpace: 'nowrap' }} title="Available Stock in Warehouse">
                        Avail: {item.available}
                      </div>

                      {orderItems.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '0.5rem', borderRadius: '8px' }}
                          onClick={() => handleRemoveRow(idx)}
                        >
                          <XIcon size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 0', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', borderTop: '1px solid var(--border-glass)', marginTop: '1.5rem' }}>
                Estimated Total: {formatCurrency(calculateTotal())}
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
                  {modalLoading ? <div className="loading-spinner"></div> : 'Confirm Order & Release Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Action Modal */}
      {showStatusModal && selectedOrder && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalContent} glass-panel`} style={{ maxWidth: '440px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Order Actions: {selectedOrder.orderNumber}</h3>
              <button className={styles.closeBtn} onClick={() => setShowStatusModal(false)}>
                <XIcon size={20} />
              </button>
            </div>

            {statusError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {statusError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                <InfoIcon size={16} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Workflow State Transition</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Update order state as it travels from warehouse shipping dispatch to final customer delivery confirmation.
              </p>
            </div>

            {selectedOrder.status === 'Pending' && (
              <div className={styles.formGroup} style={{ marginBottom: '1.5rem' }}>
                <label className={styles.inputLabel}>Carrier Tracking Number *</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. UPS-882910398"
                  disabled={modalLoading}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedOrder.status === 'Pending' && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleUpdateStatus('Shipped')}
                    disabled={modalLoading}
                  >
                    {modalLoading ? <div className="loading-spinner"></div> : 'Dispatch & Mark Shipped'}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ background: 'transparent', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}
                    onClick={() => handleUpdateStatus('Cancelled')}
                    disabled={modalLoading}
                  >
                    Cancel Order (Restock Items)
                  </button>
                </>
              )}

              {selectedOrder.status === 'Shipped' && (
                <>
                  <button
                    className="btn btn-primary"
                    style={{ background: 'var(--success)' }}
                    onClick={() => handleUpdateStatus('Delivered')}
                    disabled={modalLoading}
                  >
                    {modalLoading ? <div className="loading-spinner"></div> : 'Confirm Delivery'}
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ background: 'transparent', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}
                    onClick={() => handleUpdateStatus('Cancelled')}
                    disabled={modalLoading}
                  >
                    Cancel & Return to Stock
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
