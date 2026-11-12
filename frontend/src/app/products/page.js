'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Portal from '../../components/Portal';
import { api } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import styles from './products.module.css';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, XIcon } from '../../components/Icons';

export default function ProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null); // If editing, stores the product object
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    price: '',
    supplier: '',
    dimensions: '',
    weight: '',
    location: '',
    reorderPoint: '10',
  });

  const categories = [
    'Electronics',
    'Furniture',
    'Office Supplies',
    'Apparel',
    'Kitchenware',
    'Automotive',
    'Packaging Materials',
  ];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      let query = `/products?page=${page}&limit=8`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (category) query += `&category=${encodeURIComponent(category)}`;

      const res = await api.get(query);
      if (res.success) {
        setProducts(res.data);
        setTotalPages(res.pagination.pages);
        setTotalProducts(res.pagination.total);
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, category]); // Fetch on page/category changes immediately, search has a manual query button or enter key

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openCreateModal = () => {
    setEditProduct(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      category: categories[0],
      price: '',
      supplier: '',
      dimensions: '',
      weight: '',
      location: 'Receiving Dock',
      reorderPoint: '10',
    });
    setModalError('');
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditProduct(product);
    setFormData({
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      category: product.category || categories[0],
      price: product.price || '',
      supplier: product.supplier || '',
      dimensions: product.dimensions || '',
      weight: product.weight || '',
      location: product.inventory?.location || 'Receiving Dock',
      reorderPoint: product.inventory?.reorderPoint || '10',
    });
    setModalError('');
    setShowModal(true);
  };

  const handleGenerateSku = async () => {
    if (!formData.name || !formData.category) {
      setModalError('Please enter Product Name and Category first to generate SKU');
      return;
    }

    try {
      setModalError('');
      const res = await api.post('/products/generate-sku', {
        name: formData.name,
        category: formData.category,
      });

      if (res.success) {
        setFormData((prev) => ({ ...prev, sku: res.sku }));
      }
    } catch (err) {
      console.error(err);
      setModalError('Failed to generate SKU code: ' + err.message);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setModalError('');

    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        weight: formData.weight ? Number(formData.weight) : undefined,
        reorderPoint: Number(formData.reorderPoint),
      };

      let res;
      if (editProduct) {
        res = await api.put(`/products/${editProduct._id}`, payload);
      } else {
        res = await api.post('/products', payload);
      }

      if (res.success) {
        setShowModal(false);
        fetchProducts();
      } else {
        setModalError(res.message || 'Save failed');
      }
    } catch (err) {
      console.error(err);
      setModalError(err.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to permanently delete this product and all its inventory logs?')) {
      return;
    }

    try {
      setError('');
      const res = await api.delete(`/products/${productId}`);
      if (res.success) {
        fetchProducts();
      } else {
        setError(res.message || 'Failed to delete product');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to delete product');
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val || 0);
  };

  const isRestricted = !user || !['Admin', 'Warehouse Manager'].includes(user.role);

  return (
    <Layout>
      <div className={styles.toolbar}>
        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className={styles.filters}>
          <div className="relative" style={{ flex: 1 }}>
            <input
              type="text"
              placeholder="Search by name, SKU, or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <SearchIcon size={16} />
            </span>
          </div>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            style={{ width: '180px' }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </form>

        {/* Action Button */}
        <button className="btn btn-primary" onClick={openCreateModal}>
          <PlusIcon size={16} /> Add Product
        </button>
      </div>

      {/* Main Table */}
      {error && (
        <div className="glass-panel" style={{ padding: '1rem', color: 'var(--danger)', background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className={`${styles.tableContainer} glass-panel`}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No products found matching filters.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Supplier</th>
                <th>Location</th>
                <th>Min. Reorder</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <span className={styles.skuCode}>{product.sku}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</td>
                  <td>{product.category}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.supplier || 'N/A'}</td>
                  <td>{product.inventory?.location || 'Receiving Dock'}</td>
                  <td>{product.inventory?.reorderPoint || 10}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => openEditModal(product)} title="Edit Details">
                        <EditIcon size={16} />
                      </button>
                      {!isRestricted && (
                        <button
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={() => handleDeleteProduct(product._id)}
                          title="Delete Product"
                        >
                          <TrashIcon size={16} />
                        </button>
                      )}
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
            Showing {products.length} of {totalProducts} products
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

      {/* Create / Edit Modal */}
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
              <h3 className={styles.modalTitle}>
                {editProduct ? 'Edit Product Details' : 'Register New Product'}
              </h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                <XIcon size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveProduct}>
              <div className={styles.formGrid}>
                {/* Name */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Product Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Laser Printer H1"
                    required
                    disabled={isSaving}
                  />
                </div>

                {/* Category */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                    disabled={isSaving}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* SKU Code */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>SKU Code *</label>
                  <div className={styles.skuInputWrapper}>
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleInputChange}
                      placeholder="e.g. WW-ELE-LAS-3829"
                      required
                      disabled={isSaving || !!editProduct} // SKU locked in edits
                    />
                    {!editProduct && (
                      <button
                        type="button"
                        className="btn btn-secondary styles.generateBtn"
                        onClick={handleGenerateSku}
                        disabled={isSaving}
                      >
                        Auto SKU
                      </button>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Unit Price ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g. 199.99"
                    required
                    disabled={isSaving}
                    min="0"
                  />
                </div>

                {/* Supplier */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Supplier Name</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    placeholder="e.g. Hewlett Packard Inc."
                    disabled={isSaving}
                  />
                </div>

                {/* Warehouse Location */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Warehouse Location *</label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="e.g. Aisle 5, Bin B1"
                    required
                    disabled={isSaving}
                  />
                </div>

                {/* Reorder Point */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Min. Reorder Alert Level *</label>
                  <input
                    type="number"
                    name="reorderPoint"
                    value={formData.reorderPoint}
                    onChange={handleInputChange}
                    required
                    disabled={isSaving}
                    min="0"
                  />
                </div>

                {/* Dimensions */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Dimensions (WxHxD cm)</label>
                  <input
                    type="text"
                    name="dimensions"
                    value={formData.dimensions}
                    onChange={handleInputChange}
                    placeholder="e.g. 40x35x20 cm"
                    disabled={isSaving}
                  />
                </div>

                {/* Weight */}
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    placeholder="e.g. 6.5"
                    disabled={isSaving}
                    min="0"
                  />
                </div>
              </div>

              {/* Description */}
              <div className={styles.inputGroup} style={{ marginBottom: '1.5rem' }}>
                <label className={styles.inputLabel}>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Provide deep product specifics here..."
                  rows="3"
                  disabled={isSaving}
                ></textarea>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? <div className="loading-spinner"></div> : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Portal>
      )}
    </Layout>
  );
}
