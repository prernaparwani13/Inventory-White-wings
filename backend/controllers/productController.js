import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import { logActivity } from '../utils/auditLogger.js';

// Helper to generate SKU
const createSkuCode = async (name, category) => {
  const cleanCat = category.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const cleanName = name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const sku = `WW-${cleanCat}-${cleanName}-${rand}`;
  
  // Verify uniqueness
  const exists = await Product.findOne({ sku });
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
      const skuExists = await Product.findOne({ sku: finalSku.toUpperCase() });
      if (skuExists) {
        return res.status(400).json({ success: false, message: 'Product SKU already exists' });
      }
    }

    const product = new Product({
      name,
      sku: finalSku.toUpperCase(),
      description,
      category,
      price,
      supplier,
      dimensions,
      weight,
      createdBy: req.user._id,
    });

    const savedProduct = await product.save();

    // Automatically initialize inventory record
    const inventory = new Inventory({
      product: savedProduct._id,
      quantity: 0,
      location: location || 'Receiving Dock',
      reorderPoint: reorderPoint !== undefined ? reorderPoint : 10,
    });
    await inventory.save();

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PRODUCT_CREATE',
      details: `Created product: ${savedProduct.name} (${savedProduct.sku}) and initialized inventory`,
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: savedProduct });
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

  let query = {};

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { supplier: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    // If status filter is active, we have to look up Inventory first since status is stored there
    if (status) {
      const matchingInventory = await Inventory.find({ status }).select('product');
      const productIds = matchingInventory.map(item => item.product);
      query._id = { $in: productIds };
    }

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('createdBy', 'name email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Attach inventory details to products list
    const productIds = products.map(p => p._id);
    const inventories = await Inventory.find({ product: { $in: productIds } });

    const productsWithInventory = products.map(product => {
      const inv = inventories.find(i => i.product.toString() === product._id.toString());
      return {
        ...product._doc,
        inventory: inv || { quantity: 0, location: 'Unknown', status: 'Out of Stock', reorderPoint: 10 },
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
    const product = await Product.findById(req.params.id).populate('createdBy', 'name email');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const inventory = await Inventory.findOne({ product: product._id });

    res.json({
      success: true,
      data: {
        ...product._doc,
        inventory: inventory || { quantity: 0, location: 'Unknown', status: 'Out of Stock', reorderPoint: 10 },
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
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.name = name || product.name;
    product.category = category || product.category;
    product.price = price !== undefined ? price : product.price;
    product.supplier = supplier !== undefined ? supplier : product.supplier;
    product.dimensions = dimensions !== undefined ? dimensions : product.dimensions;
    product.weight = weight !== undefined ? weight : product.weight;

    const updatedProduct = await product.save();

    // Also update inventory values if location or reorderPoint are changed
    const inventory = await Inventory.findOne({ product: product._id });
    if (inventory) {
      if (location !== undefined) inventory.location = location;
      if (reorderPoint !== undefined) inventory.reorderPoint = reorderPoint;
      await inventory.save();
    }

    await logActivity({
      userId: req.user._id,
      userName: req.user.name,
      action: 'PRODUCT_UPDATE',
      details: `Updated product: ${updatedProduct.name} (${updatedProduct.sku})`,
      ip: req.ip,
    });

    res.json({ success: true, data: updatedProduct });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin & Warehouse Manager
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await Product.findByIdAndDelete(req.params.id);
    await Inventory.findOneAndDelete({ product: req.params.id });

    await logActivity({
      userId: req.user._id,
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
