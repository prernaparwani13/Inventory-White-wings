import prisma from '../config/db.js';
import { logActivity } from '../utils/auditLogger.js';

// Helper to generate SKU
const createSkuCode = async (name, category) => {
  const cleanCat = category.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const cleanName = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const sku = `WW-${cleanCat}-${cleanName}-${rand}`;

  // Verify uniqueness in Neon DB
  const exists = await prisma.product.findUnique({ where: { sku } });
  if (exists) {
    return createSkuCode(name, category); // Try again
  }
  return sku;
};

// @desc    Generate a suggested SKU
// @route   POST /api/products/generate-sku
// @access  Private
export const generateSuggestedSku = async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ success: false, message: 'Name and category are required' });
  }
  try {
    const sku = await createSkuCode(name, category);
    res.json({ success: true, sku });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private
export const createProduct = async (req, res) => {
  const { name, sku, description, category, price, supplier, dimensions, weight, location, reorderPoint } = req.body;

  try {
    let finalSku = sku;
    if (!finalSku) {
      finalSku = await createSkuCode(name, category);
    } else {
      // Check if SKU exists
      const skuExists = await prisma.product.findUnique({ where: { sku: finalSku.toUpperCase() } });
      if (skuExists) {
        return res.status(400).json({ success: false, message: 'Product SKU already exists' });
      }
    }

    const userId = req.user.id || req.user._id;

    const savedProduct = await prisma.product.create({
      data: {
        name,
        sku: finalSku.toUpperCase(),
        description,
        category,
        price: parseFloat(price),
        supplier,
        dimensions,
        weight: weight !== undefined && weight !== '' ? parseFloat(weight) : null,
        createdBy: userId,
      },
    });

    // Automatically initialize inventory record
    const inventory = await prisma.inventory.create({
      data: {
        productId: savedProduct.id,
        quantity: 0,
        location: location || 'Receiving Dock',
        reorderPoint: reorderPoint !== undefined ? parseInt(reorderPoint) : 10,
        status: 'Out of Stock',
      },
    });

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'PRODUCT_CREATE',
      details: `Created product: ${savedProduct.name} (${savedProduct.sku}) and initialized inventory`,
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        ...savedProduct,
        _id: savedProduct.id,
        inventory: {
          ...inventory,
          _id: inventory.id,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all products (with pagination, search & filters)
// @route   GET /api/products
// @access  Private
export const getProducts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { search, category, status } = req.query;

  try {
    const where = {};

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
        { supplier: { contains: search } },
      ];
    }

    if (status) {
      where.inventory = {
        status: status,
      };
    }

    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdByUser: {
          select: { id: true, name: true, email: true },
        },
        inventory: true,
      },
    });

    const productsWithInventory = products.map(product => {
      const inv = product.inventory;
      return {
        _id: product.id,
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.category,
        price: product.price,
        supplier: product.supplier,
        dimensions: product.dimensions,
        weight: product.weight,
        createdBy: product.createdByUser ? {
          _id: product.createdByUser.id,
          id: product.createdByUser.id,
          name: product.createdByUser.name,
          email: product.createdByUser.email,
        } : { _id: product.createdBy },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        inventory: inv ? {
          _id: inv.id,
          id: inv.id,
          quantity: inv.quantity,
          location: inv.location,
          status: inv.status,
          reorderPoint: inv.reorderPoint,
        } : { quantity: 0, location: 'Unknown', status: 'Out of Stock', reorderPoint: 10 },
      };
    });

    res.json({
      success: true,
      data: productsWithInventory,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Private
export const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        inventory: true,
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const inv = product.inventory;

    res.json({
      success: true,
      data: {
        _id: product.id,
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.category,
        price: product.price,
        supplier: product.supplier,
        dimensions: product.dimensions,
        weight: product.weight,
        createdBy: product.createdByUser ? {
          _id: product.createdByUser.id,
          id: product.createdByUser.id,
          name: product.createdByUser.name,
          email: product.createdByUser.email,
        } : { _id: product.createdBy },
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        inventory: inv ? {
          _id: inv.id,
          id: inv.id,
          quantity: inv.quantity,
          location: inv.location,
          status: inv.status,
          reorderPoint: inv.reorderPoint,
        } : { quantity: 0, location: 'Unknown', status: 'Out of Stock', reorderPoint: 10 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private
export const updateProduct = async (req, res) => {
  const { name, category, price, supplier, dimensions, weight, location, reorderPoint } = req.body;

  try {
    const productExists = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!productExists) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        name: name || undefined,
        category: category || undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        supplier: supplier !== undefined ? supplier : undefined,
        dimensions: dimensions !== undefined ? dimensions : undefined,
        weight: weight !== undefined ? (weight !== '' ? parseFloat(weight) : null) : undefined,
      },
    });

    // Also update inventory values if location or reorderPoint are changed
    if (location !== undefined || reorderPoint !== undefined) {
      const inventory = await prisma.inventory.findUnique({ where: { productId: req.params.id } });
      if (inventory) {
        await prisma.inventory.update({
          where: { productId: req.params.id },
          data: {
            location: location !== undefined ? location : undefined,
            reorderPoint: reorderPoint !== undefined ? parseInt(reorderPoint) : undefined,
          },
        });
      }
    }

    const userId = req.user.id || req.user._id;

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'PRODUCT_UPDATE',
      details: `Updated product: ${updatedProduct.name} (${updatedProduct.sku})`,
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        ...updatedProduct,
        _id: updatedProduct.id,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin & Warehouse Manager
export const deleteProduct = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await prisma.product.delete({ where: { id: req.params.id } });

    const userId = req.user.id || req.user._id;

    await logActivity({
      userId,
      userName: req.user.name,
      action: 'PRODUCT_DELETE',
      details: `Deleted product: ${product.name} (${product.sku}) and its inventory record`,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Product removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
