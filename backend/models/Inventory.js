import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  location: {
    type: String,
    required: true,
    default: 'Receiving Dock',
    trim: true,
  },
  reorderPoint: {
    type: Number,
    required: true,
    default: 10,
    min: 0,
  },
  status: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    default: 'Out of Stock',
  },
}, {
  timestamps: true,
});

// Update status automatically before saving
inventorySchema.pre('save', function (next) {
  if (this.quantity === 0) {
    this.status = 'Out of Stock';
  } else if (this.quantity <= this.reorderPoint) {
    this.status = 'Low Stock';
  } else {
    this.status = 'In Stock';
  }
  next();
});

const Inventory = mongoose.model('Inventory', inventorySchema);
export default Inventory;
