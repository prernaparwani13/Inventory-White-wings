import prisma from './config/db.js';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('--- Starting Database Seeding ---');

  // 1. Setup Users
  console.log('1. Setting up users with role-based access...');
  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashManager = await bcrypt.hash('manager123', 10);
  const passwordHashStaff = await bcrypt.hash('staff123', 10);

  // Admin User
  let admin = await prisma.user.findUnique({ where: { email: 'admin@whitewings.com' } });
  if (admin) {
    admin = await prisma.user.update({
      where: { email: 'admin@whitewings.com' },
      data: {
        name: 'John Doe (Admin)',
        password: passwordHashAdmin,
        role: 'Admin',
      },
    });
  } else {
    admin = await prisma.user.create({
      data: {
        name: 'John Doe (Admin)',
        email: 'admin@whitewings.com',
        password: passwordHashAdmin,
        role: 'Admin',
      },
    });
  }

  // Warehouse Manager User
  let manager = await prisma.user.findUnique({ where: { email: 'manager@whitewings.com' } });
  if (manager) {
    manager = await prisma.user.update({
      where: { email: 'manager@whitewings.com' },
      data: {
        name: 'Alice Smith (Manager)',
        password: passwordHashManager,
        role: 'Warehouse Manager',
      },
    });
  } else {
    manager = await prisma.user.create({
      data: {
        name: 'Alice Smith (Manager)',
        email: 'manager@whitewings.com',
        password: passwordHashManager,
        role: 'Warehouse Manager',
      },
    });
  }

  // Staff User
  let staff = await prisma.user.findUnique({ where: { email: 'staff@whitewings.com' } });
  if (staff) {
    staff = await prisma.user.update({
      where: { email: 'staff@whitewings.com' },
      data: {
        name: 'Bob Johnson (Staff)',
        password: passwordHashStaff,
        role: 'Staff',
      },
    });
  } else {
    staff = await prisma.user.create({
      data: {
        name: 'Bob Johnson (Staff)',
        email: 'staff@whitewings.com',
        password: passwordHashStaff,
        role: 'Staff',
      },
    });
  }

  // Additional Staff: David Miller (Shipping Lead)
  let staff2 = await prisma.user.findUnique({ where: { email: 'david.miller@whitewings.com' } });
  if (staff2) {
    staff2 = await prisma.user.update({
      where: { email: 'david.miller@whitewings.com' },
      data: {
        name: 'David Miller (Staff - Shipping)',
        password: passwordHashStaff,
        role: 'Staff',
      },
    });
  } else {
    staff2 = await prisma.user.create({
      data: {
        name: 'David Miller (Staff - Shipping)',
        email: 'david.miller@whitewings.com',
        password: passwordHashStaff,
        role: 'Staff',
      },
    });
  }

  // Additional Staff: Emma Wilson (Receiving Clerk)
  let staff3 = await prisma.user.findUnique({ where: { email: 'emma.wilson@whitewings.com' } });
  if (staff3) {
    staff3 = await prisma.user.update({
      where: { email: 'emma.wilson@whitewings.com' },
      data: {
        name: 'Emma Wilson (Staff - Receiving)',
        password: passwordHashStaff,
        role: 'Staff',
      },
    });
  } else {
    staff3 = await prisma.user.create({
      data: {
        name: 'Emma Wilson (Staff - Receiving)',
        email: 'emma.wilson@whitewings.com',
        password: passwordHashStaff,
        role: 'Staff',
      },
    });
  }

  console.log(`Users verified: ${admin.name}, ${manager.name}, ${staff.name}, ${staff2.name}, ${staff3.name}`);

  // Clear existing items in reverse dependency order to avoid foreign key conflicts
  console.log('Cleaning up old test records if any...');
  await prisma.transaction.deleteMany();
  await prisma.auditItem.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.return.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.auditLog.deleteMany();

  // 2. Products Data (28 products across all 7 UI categories)
  console.log('2. Inserting 28 products and inventory records across all 7 categories...');
  const productDefinitions = [
    // --- Electronics ---
    {
      name: 'UltraSlim Pro 15" Laptop (Intel i7, 32GB RAM)',
      sku: 'WW-ELE-LAP-4819',
      description: 'High-performance lightweight notebook with retina OLED display, aluminum unibody.',
      category: 'Electronics',
      price: 1199.99,
      supplier: 'NexGen Semiconductor Ltd.',
      dimensions: '14.1 x 9.5 x 0.6 in',
      weight: 1.65,
      quantity: 45,
      location: 'Aisle 5 - Secure Cage',
      reorderPoint: 10,
      createdBy: admin.id,
    },
    {
      name: '27-Inch 4K UHD Curved Professional Monitor',
      sku: 'WW-ELE-MON-2104',
      description: 'IPS panel with 99% sRGB color gamut, USB-C 90W power delivery, and adjustable stand.',
      category: 'Electronics',
      price: 349.50,
      supplier: 'NexGen Semiconductor Ltd.',
      dimensions: '24.2 x 18.5 x 8.2 in',
      weight: 5.80,
      quantity: 8, // Low Stock (reorderPoint 10)
      location: 'Aisle 1 - Bay A',
      reorderPoint: 10,
      createdBy: manager.id,
    },
    {
      name: 'Noise-Cancelling Wireless Bluetooth Headset',
      sku: 'WW-ELE-HEA-9031',
      description: 'Active noise cancellation, 40-hour battery life with multipoint pairing.',
      category: 'Electronics',
      price: 179.00,
      supplier: 'Apex Logistics & Hardware',
      dimensions: '7.8 x 6.5 x 3.2 in',
      weight: 0.28,
      quantity: 65,
      location: 'Aisle 1 - Bay B',
      reorderPoint: 15,
      createdBy: staff.id,
    },
    {
      name: 'Thunderbolt 4 Universal Docking Station',
      sku: 'WW-ELE-DOK-3312',
      description: 'Dual 4K display support, 85W host charging, gigabit ethernet, SD reader.',
      category: 'Electronics',
      price: 189.99,
      supplier: 'NexGen Semiconductor Ltd.',
      dimensions: '8.0 x 3.2 x 1.0 in',
      weight: 0.45,
      quantity: 0, // Out of Stock
      location: 'Aisle 5 - Secure Cage',
      reorderPoint: 12,
      createdBy: admin.id,
    },

    // --- Furniture ---
    {
      name: 'Executive Ergonomic High-Back Mesh Chair',
      sku: 'WW-FUR-ERG-7193',
      description: 'Breathable dual-mesh, 4D adjustable armrests, dynamic lumbar support, tilt-lock mechanism.',
      category: 'Furniture',
      price: 289.00,
      supplier: 'Nordic Ergonomics Corp.',
      dimensions: '28.0 x 28.0 x 48.0 in',
      weight: 18.50,
      quantity: 32,
      location: 'Bulk Pallet Zone 3',
      reorderPoint: 8,
      createdBy: manager.id,
    },
    {
      name: 'Motorized Dual-Motor Standing Desk (60" x 30")',
      sku: 'WW-FUR-DSK-5820',
      description: 'Solid walnut finish desktop with memory preset digital controller and anti-collision sensor.',
      category: 'Furniture',
      price: 499.00,
      supplier: 'Nordic Ergonomics Corp.',
      dimensions: '60.0 x 30.0 x 29.5 in',
      weight: 34.00,
      quantity: 14,
      location: 'Bulk Pallet Zone 3',
      reorderPoint: 5,
      createdBy: staff.id,
    },
    {
      name: '3-Drawer Heavy-Duty Steel Filing Cabinet',
      sku: 'WW-FUR-CAB-1182',
      description: 'Lockable ball-bearing slide drawers designed for letter and legal document archiving.',
      category: 'Furniture',
      price: 159.95,
      supplier: 'Global Office Dynamics',
      dimensions: '15.0 x 19.8 x 28.4 in',
      weight: 22.00,
      quantity: 4, // Low Stock (reorderPoint 6)
      location: 'Mezzanine Level 2',
      reorderPoint: 6,
      createdBy: manager.id,
    },
    {
      name: 'Industrial 5-Tier Heavy Duty Steel Bookshelf',
      sku: 'WW-FUR-BKC-6401',
      description: 'Scratch-resistant powder coated frame with reinforced rustic pine shelves.',
      category: 'Furniture',
      price: 210.00,
      supplier: 'Nordic Ergonomics Corp.',
      dimensions: '36.0 x 14.0 x 72.0 in',
      weight: 26.50,
      quantity: 18,
      location: 'Bulk Pallet Zone 3',
      reorderPoint: 5,
      createdBy: staff.id,
    },

    // --- Office Supplies ---
    {
      name: 'Premium Multipurpose Copy Paper (Case of 10 Reams)',
      sku: 'WW-OFF-PAP-8210',
      description: '20 lb bright white 96-rated 5000 sheets total. Acid-free for jam-free printing.',
      category: 'Office Supplies',
      price: 48.50,
      supplier: 'Global Office Dynamics',
      dimensions: '18.0 x 12.0 x 10.0 in',
      weight: 21.00,
      quantity: 120,
      location: 'Aisle 2 - Shelf B',
      reorderPoint: 25,
      createdBy: staff.id,
    },
    {
      name: 'High-Yield Black Laser Toner Cartridge (TN-850)',
      sku: 'WW-OFF-TON-4921',
      description: 'Yields up to 8,000 pages with sharp crisp text and rich monochrome contrast.',
      category: 'Office Supplies',
      price: 84.99,
      supplier: 'Global Office Dynamics',
      dimensions: '13.5 x 5.2 x 7.8 in',
      weight: 1.20,
      quantity: 6, // Low Stock (reorderPoint 10)
      location: 'Aisle 2 - Shelf B',
      reorderPoint: 10,
      createdBy: manager.id,
    },
    {
      name: 'Retractable Gel Roller Pens 0.7mm (Box of 24)',
      sku: 'WW-OFF-DES-3019',
      description: 'Quick-drying smooth ink formula preventing smudges, soft rubberized grip.',
      category: 'Office Supplies',
      price: 22.40,
      supplier: 'Global Office Dynamics',
      dimensions: '6.5 x 4.0 x 2.2 in',
      weight: 0.35,
      quantity: 85,
      location: 'Aisle 3 - Bin 102',
      reorderPoint: 20,
      createdBy: staff.id,
    },
    {
      name: 'Modular Acrylic Desktop Document Organizer',
      sku: 'WW-OFF-ORG-9144',
      description: '5-tier vertical and horizontal compartmentalized sorter for files and stationery.',
      category: 'Office Supplies',
      price: 34.00,
      supplier: 'Global Office Dynamics',
      dimensions: '12.5 x 9.8 x 11.2 in',
      weight: 1.40,
      quantity: 42,
      location: 'Aisle 3 - Bin 102',
      reorderPoint: 10,
      createdBy: admin.id,
    },

    // --- Apparel ---
    {
      name: 'High-Visibility Reflective Safety Vest (ANSI Class 2)',
      sku: 'WW-APP-VES-5120',
      description: 'Fluorescent yellow mesh with 2-inch reflective silver tape and multi-pocket front.',
      category: 'Apparel',
      price: 18.50,
      supplier: 'Summit Textiles & Wear',
      dimensions: '10.0 x 8.0 x 1.0 in',
      weight: 0.22,
      quantity: 150,
      location: 'Mezzanine Level 2',
      reorderPoint: 30,
      createdBy: staff.id,
    },
    {
      name: 'Heavy-Duty Industrial Nitrile Work Gloves (Box of 100)',
      sku: 'WW-APP-GLV-7731',
      description: '6 mil thickness chemical and tear resistant textured grip examination gloves.',
      category: 'Apparel',
      price: 26.90,
      supplier: 'Summit Textiles & Wear',
      dimensions: '9.5 x 4.8 x 3.0 in',
      weight: 0.85,
      quantity: 95,
      location: 'Mezzanine Level 2',
      reorderPoint: 25,
      createdBy: manager.id,
    },
    {
      name: 'Steel-Toe Waterproof Industrial Work Boots',
      sku: 'WW-APP-BOT-2849',
      description: 'Full-grain oiled leather with oil-resistant non-slip rubber lug outsole, ASTM rated.',
      category: 'Apparel',
      price: 124.95,
      supplier: 'Summit Textiles & Wear',
      dimensions: '14.0 x 11.5 x 5.2 in',
      weight: 1.95,
      quantity: 5, // Low Stock (reorderPoint 8)
      location: 'Aisle 4 - Rack C',
      reorderPoint: 8,
      createdBy: staff.id,
    },
    {
      name: 'Moisture-Wicking Heavy Duty Polo Shirts (Pack of 3)',
      sku: 'WW-APP-POL-6392',
      description: 'Breathable reinforced collar pique cotton-poly blend, wrinkle-free fabric.',
      category: 'Apparel',
      price: 45.00,
      supplier: 'Summit Textiles & Wear',
      dimensions: '12.0 x 9.0 x 2.5 in',
      weight: 0.70,
      quantity: 60,
      location: 'Mezzanine Level 2',
      reorderPoint: 15,
      createdBy: admin.id,
    },

    // --- Kitchenware ---
    {
      name: 'Commercial Stainless Steel Rapid-Boil Electric Kettle',
      sku: 'WW-KIT-KET-1092',
      description: '1.7L capacity, 1500W rapid heating element, cordless 360-degree swivel base with auto shut-off.',
      category: 'Kitchenware',
      price: 68.00,
      supplier: 'Culinary Craft Supply',
      dimensions: '9.2 x 7.4 x 10.5 in',
      weight: 1.30,
      quantity: 28,
      location: 'Aisle 4 - Rack C',
      reorderPoint: 8,
      createdBy: staff.id,
    },
    {
      name: '12-Cup Programmable Thermal Coffee Brewer',
      sku: 'WW-KIT-COF-4401',
      description: 'Double-walled vacuum insulated carafe with 24-hour brew timer and bold flavor selector.',
      category: 'Kitchenware',
      price: 89.50,
      supplier: 'Culinary Craft Supply',
      dimensions: '11.0 x 8.5 x 14.2 in',
      weight: 3.10,
      quantity: 0, // Out of Stock
      location: 'Aisle 4 - Rack C',
      reorderPoint: 5,
      createdBy: manager.id,
    },
    {
      name: 'High-Speed Professional Countertop Blender (1200W)',
      sku: 'WW-KIT-BLN-8123',
      description: '64 oz BPA-free jar, hardened stainless steel blades with variable pulse speed control.',
      category: 'Kitchenware',
      price: 115.00,
      supplier: 'Culinary Craft Supply',
      dimensions: '8.8 x 7.5 x 17.5 in',
      weight: 4.20,
      quantity: 22,
      location: 'Aisle 4 - Rack C',
      reorderPoint: 6,
      createdBy: staff.id,
    },
    {
      name: 'German High-Carbon Steel 8-Piece Chef Knife Set',
      sku: 'WW-KIT-CUT-3674',
      description: 'Forged full-tang blades housed in solid acacia wood block with integrated sharpening slot.',
      category: 'Kitchenware',
      price: 149.99,
      supplier: 'Culinary Craft Supply',
      dimensions: '14.5 x 9.0 x 6.5 in',
      weight: 3.80,
      quantity: 19,
      location: 'Aisle 5 - Secure Cage',
      reorderPoint: 5,
      createdBy: admin.id,
    },

    // --- Automotive ---
    {
      name: '3-Ton Heavy-Duty Low Profile Hydraulic Floor Jack',
      sku: 'WW-AUT-HYD-5281',
      description: 'Dual pump rapid lifting system with universal joint release mechanism and rubber saddle.',
      category: 'Automotive',
      price: 185.00,
      supplier: 'AutoPro Parts Distributing',
      dimensions: '27.5 x 13.5 x 6.5 in',
      weight: 32.50,
      quantity: 16,
      location: 'Bulk Pallet Zone 3',
      reorderPoint: 4,
      createdBy: manager.id,
    },
    {
      name: 'Digital Preset Tire Inflator & Diagnostic Gauge',
      sku: 'WW-AUT-INF-9410',
      description: 'Backlit LCD readout with 150 PSI maximum rating and auto shutoff when target pressure reached.',
      category: 'Automotive',
      price: 42.50,
      supplier: 'AutoPro Parts Distributing',
      dimensions: '7.8 x 5.2 x 2.8 in',
      weight: 0.95,
      quantity: 38,
      location: 'Aisle 3 - Bin 102',
      reorderPoint: 10,
      createdBy: staff.id,
    },
    {
      name: '1000A Emergency Jump Starter & 18W Power Bank',
      sku: 'WW-AUT-JUM-1628',
      description: 'Up to 6.0L gas and 4.0L diesel engines, integrated LED tactical flashlight and dual USB ports.',
      category: 'Automotive',
      price: 98.00,
      supplier: 'AutoPro Parts Distributing',
      dimensions: '6.8 x 3.4 x 1.4 in',
      weight: 0.65,
      quantity: 3, // Low Stock (reorderPoint 8)
      location: 'Aisle 5 - Secure Cage',
      reorderPoint: 8,
      createdBy: staff.id,
    },
    {
      name: 'All-Weather Aerodynamic Silicone Wiper Blades (Pair 24"/19")',
      sku: 'WW-AUT-WIP-7305',
      description: 'Water-repelling hydro-shield coating with dual steel tension spring for uniform streak-free wiping.',
      category: 'Automotive',
      price: 31.00,
      supplier: 'AutoPro Parts Distributing',
      dimensions: '26.0 x 3.0 x 1.5 in',
      weight: 0.40,
      quantity: 74,
      location: 'Aisle 3 - Bin 102',
      reorderPoint: 15,
      createdBy: admin.id,
    },

    // --- Packaging Materials ---
    {
      name: 'Heavy-Duty Corrugated Shipping Boxes 18x14x12 (Bundle of 25)',
      sku: 'WW-PAC-BOX-3291',
      description: '32 ECT single-wall certified kraft boxes supporting up to 65 lbs stacking pressure.',
      category: 'Packaging Materials',
      price: 44.00,
      supplier: 'OmniPack Solutions',
      dimensions: '30.0 x 26.0 x 8.0 in',
      weight: 12.50,
      quantity: 110,
      location: 'Receiving Dock',
      reorderPoint: 25,
      createdBy: staff.id,
    },
    {
      name: 'Industrial Reinforced Acrylic Packing Tape (6 Rolls)',
      sku: 'WW-PAC-TAP-6523',
      description: '2.8 mil thick ultra-strong adhesive backing resistant to splitting and extreme temperature variance.',
      category: 'Packaging Materials',
      price: 28.50,
      supplier: 'OmniPack Solutions',
      dimensions: '9.0 x 6.0 x 4.0 in',
      weight: 1.80,
      quantity: 85,
      location: 'Receiving Dock',
      reorderPoint: 20,
      createdBy: manager.id,
    },
    {
      name: 'Anti-Static Protective Bubble Cushioning Wrap (12" x 350ft)',
      sku: 'WW-PAC-BUB-8910',
      description: '5/16-inch medium bubble with nylon barrier seal retaining air longer for fragile electronics.',
      category: 'Packaging Materials',
      price: 36.00,
      supplier: 'OmniPack Solutions',
      dimensions: '24.0 x 24.0 x 12.0 in',
      weight: 4.50,
      quantity: 40,
      location: 'Receiving Dock',
      reorderPoint: 12,
      createdBy: staff.id,
    },
    {
      name: 'High-Clarity Industrial Stretch Wrap Film (4 Rolls, 80 Gauge)',
      sku: 'WW-PAC-STR-1478',
      description: '18-inch by 1500ft per roll heavy gauge self-adhering pallet wrap with high puncture resistance.',
      category: 'Packaging Materials',
      price: 58.00,
      supplier: 'OmniPack Solutions',
      dimensions: '19.0 x 9.0 x 9.0 in',
      weight: 16.00,
      quantity: 0, // Out of Stock
      location: 'Receiving Dock',
      reorderPoint: 10,
      createdBy: admin.id,
    },
  ];

  const createdProducts = [];
  for (const item of productDefinitions) {
    const status = item.quantity <= 0 ? 'Out of Stock' : (item.quantity <= item.reorderPoint ? 'Low Stock' : 'In Stock');
    const product = await prisma.product.create({
      data: {
        name: item.name,
        sku: item.sku,
        description: item.description,
        category: item.category,
        price: item.price,
        supplier: item.supplier,
        dimensions: item.dimensions,
        weight: item.weight,
        createdBy: item.createdBy,
        inventory: {
          create: {
            quantity: item.quantity,
            location: item.location,
            reorderPoint: item.reorderPoint,
            status: status,
          },
        },
      },
      include: { inventory: true },
    });
    createdProducts.push(product);
  }
  console.log(`Successfully created ${createdProducts.length} products.`);

  // 3. Orders Data (24 realistic orders with items, statuses, addresses, timestamps)
  console.log('3. Inserting 24 orders with multi-line items across all statuses...');
  const orderPresets = [
    {
      customerName: 'Apex Logistics LLC',
      shippingAddress: '4500 Industrial Pkwy, Bldg C, Chicago, IL 60632',
      status: 'Delivered',
      trackingNumber: 'FEDEX-84920172',
      daysAgo: 28,
      deliveredDaysAgo: 24,
      items: [
        { sku: 'WW-ELE-LAP-4819', qty: 2 },
        { sku: 'WW-ELE-MON-2104', qty: 2 },
        { sku: 'WW-PAC-BOX-3291', qty: 4 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'TechCorp Global Headquarters',
      shippingAddress: '100 Innovation Way, Suite 400, Austin, TX 78701',
      status: 'Delivered',
      trackingNumber: 'UPS-91028341',
      daysAgo: 25,
      deliveredDaysAgo: 22,
      items: [
        { sku: 'WW-FUR-ERG-7193', qty: 4 },
        { sku: 'WW-FUR-DSK-5820', qty: 2 },
      ],
      createdBy: staff2.id,
    },
    {
      customerName: 'Meridian Retail Solutions',
      shippingAddress: '842 Market St, Floor 5, San Francisco, CA 94103',
      status: 'Delivered',
      trackingNumber: 'FEDEX-19482039',
      daysAgo: 22,
      deliveredDaysAgo: 19,
      items: [
        { sku: 'WW-ELE-HEA-9031', qty: 5 },
        { sku: 'WW-OFF-PAP-8210', qty: 8 },
        { sku: 'WW-OFF-DES-3019', qty: 6 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'Summit Healthcare Systems',
      shippingAddress: '1200 Medical Center Dr, Atlanta, GA 30318',
      status: 'Delivered',
      trackingNumber: 'DHL-38192044',
      daysAgo: 20,
      deliveredDaysAgo: 17,
      items: [
        { sku: 'WW-APP-VES-5120', qty: 15 },
        { sku: 'WW-APP-GLV-7731', qty: 10 },
      ],
      createdBy: staff3.id,
    },
    {
      customerName: 'Beacon Creative Media Group',
      shippingAddress: '555 Broadway Ave, New York, NY 10012',
      status: 'Delivered',
      trackingNumber: 'UPS-74819203',
      daysAgo: 18,
      deliveredDaysAgo: 15,
      items: [
        { sku: 'WW-ELE-LAP-4819', qty: 3 },
        { sku: 'WW-ELE-MON-2104', qty: 3 },
      ],
      createdBy: admin.id,
    },
    {
      customerName: 'Vanguard Industrial Works',
      shippingAddress: '3100 Steel Mill Rd, Pittsburgh, PA 15201',
      status: 'Delivered',
      trackingNumber: 'FEDEX-61029481',
      daysAgo: 16,
      deliveredDaysAgo: 13,
      items: [
        { sku: 'WW-AUT-HYD-5281', qty: 2 },
        { sku: 'WW-APP-BOT-2849', qty: 4 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'Horizon Architecture & Design',
      shippingAddress: '720 Pine St, Suite 800, Seattle, WA 98101',
      status: 'Delivered',
      trackingNumber: 'UPS-49102837',
      daysAgo: 15,
      deliveredDaysAgo: 12,
      items: [
        { sku: 'WW-FUR-BKC-6401', qty: 2 },
        { sku: 'WW-OFF-ORG-9144', qty: 4 },
      ],
      createdBy: staff2.id,
    },
    {
      customerName: 'Nova Fleet Services',
      shippingAddress: '1800 Airport Rd, Hangar 4, Dallas, TX 75261',
      status: 'Delivered',
      trackingNumber: 'FEDEX-94810239',
      daysAgo: 14,
      deliveredDaysAgo: 11,
      items: [
        { sku: 'WW-AUT-INF-9410', qty: 6 },
        { sku: 'WW-AUT-WIP-7305', qty: 8 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'Quantum Dynamics Inc.',
      shippingAddress: '250 Technology Square, Cambridge, MA 02139',
      status: 'Delivered',
      trackingNumber: 'DHL-84019284',
      daysAgo: 12,
      deliveredDaysAgo: 9,
      items: [
        { sku: 'WW-ELE-LAP-4819', qty: 1 },
        { sku: 'WW-ELE-HEA-9031', qty: 2 },
        { sku: 'WW-OFF-TON-4921', qty: 2 },
      ],
      createdBy: admin.id,
    },
    {
      customerName: 'Blue Ridge Hospitality Corp.',
      shippingAddress: '400 Mountain View Rd, Denver, CO 80202',
      status: 'Delivered',
      trackingNumber: 'UPS-39201948',
      daysAgo: 10,
      deliveredDaysAgo: 7,
      items: [
        { sku: 'WW-KIT-KET-1092', qty: 4 },
        { sku: 'WW-KIT-CUT-3674', qty: 2 },
      ],
      createdBy: staff3.id,
    },
    {
      customerName: 'Metro Wholesale Distributors',
      shippingAddress: '6500 Harbor Blvd, Miami, FL 33132',
      status: 'Delivered',
      trackingNumber: 'FEDEX-20391820',
      daysAgo: 9,
      deliveredDaysAgo: 6,
      items: [
        { sku: 'WW-PAC-BOX-3291', qty: 10 },
        { sku: 'WW-PAC-TAP-6523', qty: 8 },
        { sku: 'WW-PAC-BUB-8910', qty: 4 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'Pacific Freight Forwarding',
      shippingAddress: '900 Terminal Way, Berth 14, Los Angeles, CA 90021',
      status: 'Delivered',
      trackingNumber: 'UPS-90281940',
      daysAgo: 8,
      deliveredDaysAgo: 5,
      items: [
        { sku: 'WW-APP-VES-5120', qty: 20 },
        { sku: 'WW-APP-GLV-7731', qty: 15 },
      ],
      createdBy: staff2.id,
    },

    // --- Shipped Orders (in transit) ---
    {
      customerName: 'Elena Rostova (Studio Design)',
      shippingAddress: '1422 Elmwood Ave, Boston, MA 02116',
      status: 'Shipped',
      trackingNumber: 'FEDEX-48192049',
      daysAgo: 4,
      items: [
        { sku: 'WW-FUR-ERG-7193', qty: 1 },
        { sku: 'WW-ELE-MON-2104', qty: 1 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'Marcus Chen Engineering',
      shippingAddress: '305 West End Ave, Suite 12, Portland, OR 97201',
      status: 'Shipped',
      trackingNumber: 'UPS-58291048',
      daysAgo: 3,
      items: [
        { sku: 'WW-ELE-LAP-4819', qty: 2 },
        { sku: 'WW-ELE-HEA-9031', qty: 2 },
      ],
      createdBy: staff2.id,
    },
    {
      customerName: 'Sophia Patel Medical Clinic',
      shippingAddress: '880 Oak Ridge Ln, Raleigh, NC 27607',
      status: 'Shipped',
      trackingNumber: 'DHL-19203948',
      daysAgo: 3,
      items: [
        { sku: 'WW-APP-GLV-7731', qty: 8 },
        { sku: 'WW-OFF-PAP-8210', qty: 4 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'David K. Richardson',
      shippingAddress: '2100 University Ave SE, Minneapolis, MN 55414',
      status: 'Shipped',
      trackingNumber: 'FEDEX-72910284',
      daysAgo: 2,
      items: [
        { sku: 'WW-KIT-BLN-8123', qty: 1 },
        { sku: 'WW-KIT-CUT-3674', qty: 1 },
      ],
      createdBy: staff3.id,
    },
    {
      customerName: 'Patterson Auto Body Works',
      shippingAddress: '1205 Industrial Rd, Detroit, MI 48202',
      status: 'Shipped',
      trackingNumber: 'UPS-10492810',
      daysAgo: 1,
      items: [
        { sku: 'WW-AUT-HYD-5281', qty: 1 },
        { sku: 'WW-AUT-INF-9410', qty: 2 },
        { sku: 'WW-AUT-WIP-7305', qty: 4 },
      ],
      createdBy: admin.id,
    },

    // --- Pending Orders (Awaiting fulfillment) ---
    {
      customerName: 'Greenwood Consulting Group',
      shippingAddress: '540 S Michigan Ave, 18th Floor, Chicago, IL 60605',
      status: 'Pending',
      daysAgo: 2,
      items: [
        { sku: 'WW-FUR-DSK-5820', qty: 1 },
        { sku: 'WW-FUR-CAB-1182', qty: 1 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'Amanda Morales Catering',
      shippingAddress: '742 Sunburst Dr, Phoenix, AZ 85004',
      status: 'Pending',
      daysAgo: 1,
      items: [
        { sku: 'WW-KIT-KET-1092', qty: 2 },
        { sku: 'WW-KIT-BLN-8123', qty: 2 },
      ],
      createdBy: staff2.id,
    },
    {
      customerName: 'Lucas Vance Logistics',
      shippingAddress: '390 Riverfront Pkwy, Dock 7, Memphis, TN 38103',
      status: 'Pending',
      daysAgo: 1,
      items: [
        { sku: 'WW-APP-VES-5120', qty: 10 },
        { sku: 'WW-APP-BOT-2849', qty: 2 },
      ],
      createdBy: staff.id,
    },
    {
      customerName: 'Sarah Jenkins Architecture',
      shippingAddress: '1500 Capitol Ave, Sacramento, CA 95814',
      status: 'Pending',
      daysAgo: 0,
      items: [
        { sku: 'WW-ELE-MON-2104', qty: 2 },
        { sku: 'WW-OFF-ORG-9144', qty: 3 },
      ],
      createdBy: staff3.id,
    },
    {
      customerName: 'O\'Connor Packaging Co.',
      shippingAddress: '820 Commercial St, Boston, MA 02109',
      status: 'Pending',
      daysAgo: 0,
      items: [
        { sku: 'WW-PAC-BOX-3291', qty: 8 },
        { sku: 'WW-PAC-TAP-6523', qty: 6 },
      ],
      createdBy: staff.id,
    },

    // --- Cancelled Orders ---
    {
      customerName: 'Thomas Wright Manufacturing',
      shippingAddress: '410 Foundry St, Cleveland, OH 44113',
      status: 'Cancelled',
      daysAgo: 11,
      items: [
        { sku: 'WW-AUT-HYD-5281', qty: 1 },
      ],
      createdBy: staff2.id,
    },
    {
      customerName: 'Foster BioTech Labs',
      shippingAddress: '600 Discovery Way, Suite 100, San Diego, CA 92121',
      status: 'Cancelled',
      daysAgo: 7,
      items: [
        { sku: 'WW-ELE-LAP-4819', qty: 1 },
        { sku: 'WW-ELE-HEA-9031', qty: 1 },
      ],
      createdBy: staff.id,
    },
  ];

  const productMap = new Map();
  createdProducts.forEach(p => productMap.set(p.sku, p));

  const createdOrders = [];
  let orderNumberCounter = 10101;

  for (const preset of orderPresets) {
    const orderNumber = `ORD-${orderNumberCounter++}`;
    let totalAmount = 0;
    const itemsData = [];

    for (const item of preset.items) {
      const prod = productMap.get(item.sku);
      if (!prod) continue;
      const price = prod.price;
      totalAmount += price * item.qty;
      itemsData.push({
        productId: prod.id,
        quantity: item.qty,
        price: price,
      });
    }

    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - preset.daysAgo);

    let shippedAtDate = null;
    let deliveredAtDate = null;

    if (preset.status === 'Shipped' || preset.status === 'Delivered') {
      shippedAtDate = new Date(createdAtDate);
      shippedAtDate.setHours(shippedAtDate.getHours() + 18);
    }

    if (preset.status === 'Delivered') {
      deliveredAtDate = new Date();
      deliveredAtDate.setDate(deliveredAtDate.getDate() - (preset.deliveredDaysAgo || 1));
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: preset.customerName,
        shippingAddress: preset.shippingAddress,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        status: preset.status,
        trackingNumber: preset.trackingNumber || null,
        shippedAt: shippedAtDate,
        deliveredAt: deliveredAtDate,
        createdBy: preset.createdBy,
        createdAt: createdAtDate,
        updatedAt: deliveredAtDate || shippedAtDate || createdAtDate,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
    createdOrders.push(order);
  }
  console.log(`Successfully created ${createdOrders.length} orders.`);

  // 4. Returns Data (18 realistic returns across all 4 statuses)
  console.log('4. Inserting 18 returns across all statuses...');
  const returnPresets = [
    // Approved & Restocked
    {
      orderIdx: 0,
      sku: 'WW-PAC-BOX-3291',
      qty: 1,
      reason: 'Incorrect Item',
      status: 'Approved & Restocked',
      actionTaken: 'Inspected unopened bundle and returned to Receiving Dock stock.',
      processedBy: manager.id,
      daysAgo: 21,
    },
    {
      orderIdx: 2,
      sku: 'WW-ELE-HEA-9031',
      qty: 1,
      reason: 'Customer Return',
      status: 'Approved & Restocked',
      actionTaken: 'Customer ordered wrong color. Seal intact; returned to Aisle 1 - Bay B.',
      processedBy: admin.id,
      daysAgo: 16,
    },
    {
      orderIdx: 3,
      sku: 'WW-APP-VES-5120',
      qty: 2,
      reason: 'Incorrect Item',
      status: 'Approved & Restocked',
      actionTaken: 'Exchanged for Class 3 variant; restocked Class 2 units into inventory.',
      processedBy: manager.id,
      daysAgo: 14,
    },
    {
      orderIdx: 5,
      sku: 'WW-APP-BOT-2849',
      qty: 1,
      reason: 'Customer Return',
      status: 'Approved & Restocked',
      actionTaken: 'Size exchange (ordered 10 instead of 11). Inspected mint condition and restocked.',
      processedBy: manager.id,
      daysAgo: 11,
    },
    {
      orderIdx: 7,
      sku: 'WW-AUT-INF-9410',
      qty: 1,
      reason: 'Customer Return',
      status: 'Approved & Restocked',
      actionTaken: 'Surplus unit returned by fleet manager. Tested ok and returned to bin.',
      processedBy: admin.id,
      daysAgo: 8,
    },
    {
      orderIdx: 9,
      sku: 'WW-KIT-KET-1092',
      qty: 1,
      reason: 'Incorrect Item',
      status: 'Approved & Restocked',
      actionTaken: 'Received electric kettle instead of brewer. Box intact; restocked to Rack C.',
      processedBy: manager.id,
      daysAgo: 5,
    },
    {
      orderIdx: 10,
      sku: 'WW-PAC-TAP-6523',
      qty: 2,
      reason: 'Customer Return',
      status: 'Approved & Restocked',
      actionTaken: 'Extra tape pack returned by wholesale partner. Re-cataloged into stock.',
      processedBy: manager.id,
      daysAgo: 4,
    },

    // Rejected
    {
      orderIdx: 1,
      sku: 'WW-FUR-ERG-7193',
      qty: 1,
      reason: 'Customer Return',
      status: 'Rejected',
      actionTaken: 'Return rejected: Chair was assembled, used for 2 weeks with noticeable scuffs on armrest.',
      processedBy: manager.id,
      daysAgo: 18,
    },
    {
      orderIdx: 4,
      sku: 'WW-ELE-LAP-4819',
      qty: 1,
      reason: 'Customer Return',
      status: 'Rejected',
      actionTaken: 'Return rejected: Software locks activated and packaging missing original accessories.',
      processedBy: admin.id,
      daysAgo: 12,
    },
    {
      orderIdx: 8,
      sku: 'WW-OFF-TON-4921',
      qty: 1,
      reason: 'Customer Return',
      status: 'Rejected',
      actionTaken: 'Return rejected: Protective seal removed and toner cartridge inserted into third-party printer.',
      processedBy: manager.id,
      daysAgo: 7,
    },

    // Scrapped
    {
      orderIdx: 0,
      sku: 'WW-ELE-MON-2104',
      qty: 1,
      reason: 'Transit Damage',
      status: 'Scrapped',
      actionTaken: 'Courier dropped container. Internal display panel cracked and shattered. Logged for carrier claim & scrap.',
      processedBy: manager.id,
      daysAgo: 22,
    },
    {
      orderIdx: 6,
      sku: 'WW-FUR-BKC-6401',
      qty: 1,
      reason: 'Transit Damage',
      status: 'Scrapped',
      actionTaken: 'Bent lower frame and fractured shelf caused by forklift impact during transit. Written off as scrap.',
      processedBy: admin.id,
      daysAgo: 10,
    },
    {
      orderIdx: 9,
      sku: 'WW-KIT-CUT-3674',
      qty: 1,
      reason: 'Defective',
      status: 'Scrapped',
      actionTaken: 'Manufacturing defect: Cracked acacia wood housing block and chipped blade edge. Discarded to scrap.',
      processedBy: manager.id,
      daysAgo: 6,
    },

    // Pending Approval (Ready for interactive testing by Admin or Warehouse Manager)
    {
      orderIdx: 11,
      sku: 'WW-APP-GLV-7731',
      qty: 2,
      reason: 'Incorrect Item',
      status: 'Pending Approval',
      daysAgo: 3,
    },
    {
      orderIdx: 12,
      sku: 'WW-ELE-MON-2104',
      qty: 1,
      reason: 'Defective',
      status: 'Pending Approval',
      daysAgo: 2,
    },
    {
      orderIdx: 13,
      sku: 'WW-ELE-HEA-9031',
      qty: 1,
      reason: 'Customer Return',
      status: 'Pending Approval',
      daysAgo: 2,
    },
    {
      orderIdx: 14,
      sku: 'WW-OFF-PAP-8210',
      qty: 1,
      reason: 'Transit Damage',
      status: 'Pending Approval',
      daysAgo: 1,
    },
    {
      orderIdx: 15,
      sku: 'WW-KIT-BLN-8123',
      qty: 1,
      reason: 'Defective',
      status: 'Pending Approval',
      daysAgo: 0,
    },
  ];

  let returnNumberCounter = 20201;
  const createdReturns = [];

  for (const preset of returnPresets) {
    const targetOrder = createdOrders[preset.orderIdx] || createdOrders[0];
    const prod = productMap.get(preset.sku);
    if (!prod) continue;

    const returnNumber = `RET-${returnNumberCounter++}`;
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - preset.daysAgo);

    const ret = await prisma.return.create({
      data: {
        returnNumber,
        orderNumber: targetOrder.orderNumber,
        productId: prod.id,
        quantity: preset.qty,
        reason: preset.reason,
        status: preset.status,
        actionTaken: preset.actionTaken || null,
        processedBy: preset.processedBy || null,
        createdAt: createdAtDate,
        updatedAt: createdAtDate,
      },
    });
    createdReturns.push(ret);
  }
  console.log(`Successfully created ${createdReturns.length} returns.`);

  // 5. Stock Audits Data (10 audits: 7 reconciled, 3 draft for interactive testing)
  console.log('5. Inserting 10 stock audits (7 reconciled, 3 draft)...');
  const auditPresets = [
    // Historical Reconciled Audits
    {
      auditNumber: 'AUD-10492',
      status: 'Reconciled',
      auditedBy: admin.id,
      daysAgo: 40,
      reconciledDaysAgo: 39,
      items: [
        { sku: 'WW-ELE-LAP-4819', expected: 50, actual: 50, remarks: 'Verified serial numbers against asset tags. 100% matched.' },
        { sku: 'WW-ELE-MON-2104', expected: 15, actual: 15, remarks: 'Bay A count matched.' },
        { sku: 'WW-ELE-HEA-9031', expected: 80, actual: 78, remarks: 'Shortage of 2 units; later confirmed shipped on unlogged sample order.' },
      ],
    },
    {
      auditNumber: 'AUD-21840',
      status: 'Reconciled',
      auditedBy: manager.id,
      daysAgo: 34,
      reconciledDaysAgo: 33,
      items: [
        { sku: 'WW-FUR-ERG-7193', expected: 40, actual: 40, remarks: 'Pallet count verified.' },
        { sku: 'WW-FUR-DSK-5820', expected: 20, actual: 19, remarks: '1 unit missing due to showroom display transfer.' },
        { sku: 'WW-FUR-CAB-1182', expected: 8, actual: 8, remarks: 'Matches shelf inventory.' },
      ],
    },
    {
      auditNumber: 'AUD-33912',
      status: 'Reconciled',
      auditedBy: manager.id,
      daysAgo: 28,
      reconciledDaysAgo: 27,
      items: [
        { sku: 'WW-OFF-PAP-8210', expected: 150, actual: 150, remarks: 'Full pallet count exact.' },
        { sku: 'WW-OFF-TON-4921', expected: 12, actual: 12, remarks: 'All sealed boxes accounted for.' },
        { sku: 'WW-OFF-DES-3019', expected: 100, actual: 102, remarks: 'Surplus of 2 boxes recovered from packing station.' },
      ],
    },
    {
      auditNumber: 'AUD-45201',
      status: 'Reconciled',
      auditedBy: admin.id,
      daysAgo: 22,
      reconciledDaysAgo: 21,
      items: [
        { sku: 'WW-APP-VES-5120', expected: 180, actual: 180, remarks: 'Stock matches ledger.' },
        { sku: 'WW-APP-GLV-7731', expected: 120, actual: 120, remarks: 'No discrepancies.' },
        { sku: 'WW-APP-BOT-2849', expected: 10, actual: 9, remarks: '1 pair sent for safety compliance lab testing.' },
      ],
    },
    {
      auditNumber: 'AUD-57193',
      status: 'Reconciled',
      auditedBy: manager.id,
      daysAgo: 17,
      reconciledDaysAgo: 16,
      items: [
        { sku: 'WW-KIT-KET-1092', expected: 35, actual: 35, remarks: 'Inventory intact on Rack C.' },
        { sku: 'WW-KIT-BLN-8123', expected: 25, actual: 25, remarks: 'Counts match.' },
        { sku: 'WW-KIT-CUT-3674', expected: 22, actual: 22, remarks: 'Verified in lockup.' },
      ],
    },
    {
      auditNumber: 'AUD-69024',
      status: 'Reconciled',
      auditedBy: manager.id,
      daysAgo: 12,
      reconciledDaysAgo: 11,
      items: [
        { sku: 'WW-AUT-HYD-5281', expected: 20, actual: 20, remarks: 'Heavy equipment pallets verified.' },
        { sku: 'WW-AUT-INF-9410', expected: 45, actual: 45, remarks: 'All bin items verified.' },
        { sku: 'WW-AUT-WIP-7305', expected: 85, actual: 85, remarks: 'Pairs counted and matched.' },
      ],
    },
    {
      auditNumber: 'AUD-78192',
      status: 'Reconciled',
      auditedBy: admin.id,
      daysAgo: 8,
      reconciledDaysAgo: 7,
      items: [
        { sku: 'WW-PAC-BOX-3291', expected: 130, actual: 130, remarks: 'Bundle strapping count accurate.' },
        { sku: 'WW-PAC-TAP-6523', expected: 100, actual: 98, remarks: '2 rolls damaged by water leak; written off.' },
        { sku: 'WW-PAC-BUB-8910', expected: 45, actual: 45, remarks: 'Rolls in receiving dock verified.' },
      ],
    },

    // Draft Audits (Active / In-progress, perfect for testing reconciliation submission)
    {
      auditNumber: 'AUD-88401',
      status: 'Draft',
      auditedBy: manager.id,
      daysAgo: 3,
      items: [
        { sku: 'WW-ELE-LAP-4819', expected: 45, actual: 45, remarks: 'Serial audit in progress by Alice Smith' },
        { sku: 'WW-ELE-MON-2104', expected: 8, actual: 8, remarks: 'Spot-check verified' },
        { sku: 'WW-ELE-HEA-9031', expected: 65, actual: 65, remarks: 'Counted Bay B shelf 2' },
      ],
    },
    {
      auditNumber: 'AUD-92105',
      status: 'Draft',
      auditedBy: admin.id,
      daysAgo: 1,
      items: [
        { sku: 'WW-FUR-ERG-7193', expected: 32, actual: 32, remarks: 'Zone 3 pallet count in progress' },
        { sku: 'WW-FUR-DSK-5820', expected: 14, actual: 14, remarks: 'Flat packs verified' },
        { sku: 'WW-FUR-BKC-6401', expected: 18, actual: 18, remarks: 'Pending final sign-off' },
      ],
    },
    {
      auditNumber: 'AUD-99210',
      status: 'Draft',
      auditedBy: manager.id,
      daysAgo: 0,
      items: [
        { sku: 'WW-APP-VES-5120', expected: 150, actual: 150, remarks: 'Initial count initiated' },
        { sku: 'WW-APP-GLV-7731', expected: 95, actual: 95, remarks: 'Boxes tallied' },
        { sku: 'WW-APP-BOT-2849', expected: 5, actual: 5, remarks: 'Rack C checked' },
      ],
    },
  ];

  const createdAudits = [];
  for (const preset of auditPresets) {
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - preset.daysAgo);

    let reconciledAtDate = null;
    if (preset.status === 'Reconciled') {
      reconciledAtDate = new Date();
      reconciledAtDate.setDate(reconciledAtDate.getDate() - preset.reconciledDaysAgo);
    }

    const itemsData = preset.items.map(item => {
      const prod = productMap.get(item.sku);
      const discrepancy = item.actual - item.expected;
      return {
        productId: prod.id,
        expectedQty: item.expected,
        actualQty: item.actual,
        discrepancy: discrepancy,
        remarks: item.remarks,
      };
    });

    const audit = await prisma.audit.create({
      data: {
        auditNumber: preset.auditNumber,
        status: preset.status,
        auditedBy: preset.auditedBy,
        reconciledAt: reconciledAtDate,
        createdAt: createdAtDate,
        updatedAt: reconciledAtDate || createdAtDate,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });
    createdAudits.push(audit);
  }
  console.log(`Successfully created ${createdAudits.length} stock audits.`);

  // 6. Stock Transactions (42 comprehensive transaction records)
  console.log('6. Inserting 42 stock transactions across In, Out, Return, and Reconciliation...');
  const transactionPresets = [
    // Initial Stock In (Procurement Receipts)
    { sku: 'WW-ELE-LAP-4819', type: 'In', qty: 50, prev: 0, next: 50, reason: 'PO-2026-081 Receipt from NexGen Semiconductor Ltd.', user: manager.id, daysAgo: 45 },
    { sku: 'WW-ELE-MON-2104', type: 'In', qty: 20, prev: 0, next: 20, reason: 'PO-2026-082 Shipment arrival at Receiving Dock', user: staff3.id, daysAgo: 44 },
    { sku: 'WW-ELE-HEA-9031', type: 'In', qty: 80, prev: 0, next: 80, reason: 'PO-2026-083 Wholesale stock intake', user: staff.id, daysAgo: 44 },
    { sku: 'WW-FUR-ERG-7193', type: 'In', qty: 40, prev: 0, next: 40, reason: 'PO-2026-084 Pallet delivery from Nordic Ergonomics', user: manager.id, daysAgo: 43 },
    { sku: 'WW-FUR-DSK-5820', type: 'In', qty: 20, prev: 0, next: 20, reason: 'PO-2026-085 Freight container unboxing', user: staff2.id, daysAgo: 42 },
    { sku: 'WW-FUR-CAB-1182', type: 'In', qty: 10, prev: 0, next: 10, reason: 'PO-2026-086 Initial inventory intake', user: staff.id, daysAgo: 42 },
    { sku: 'WW-FUR-BKC-6401', type: 'In', qty: 25, prev: 0, next: 25, reason: 'PO-2026-087 Warehouse restocking', user: staff3.id, daysAgo: 41 },
    { sku: 'WW-OFF-PAP-8210', type: 'In', qty: 150, prev: 0, next: 150, reason: 'PO-2026-088 Bulk paper ream pallets received', user: staff.id, daysAgo: 40 },
    { sku: 'WW-OFF-TON-4921', type: 'In', qty: 15, prev: 0, next: 15, reason: 'PO-2026-089 Laser toner supplier delivery', user: manager.id, daysAgo: 40 },
    { sku: 'WW-OFF-DES-3019', type: 'In', qty: 100, prev: 0, next: 100, reason: 'PO-2026-090 Stationery box shipment', user: staff2.id, daysAgo: 39 },
    { sku: 'WW-OFF-ORG-9144', type: 'In', qty: 50, prev: 0, next: 50, reason: 'PO-2026-091 Acrylic organizers received', user: staff.id, daysAgo: 39 },
    { sku: 'WW-APP-VES-5120', type: 'In', qty: 200, prev: 0, next: 200, reason: 'PO-2026-092 Safety gear bulk delivery', user: staff3.id, daysAgo: 38 },
    { sku: 'WW-APP-GLV-7731', type: 'In', qty: 130, prev: 0, next: 130, reason: 'PO-2026-093 Nitrile gloves case shipment', user: manager.id, daysAgo: 38 },
    { sku: 'WW-APP-BOT-2849', type: 'In', qty: 12, prev: 0, next: 12, reason: 'PO-2026-094 Steel-toe work boots intake', user: staff.id, daysAgo: 37 },
    { sku: 'WW-KIT-KET-1092', type: 'In', qty: 35, prev: 0, next: 35, reason: 'PO-2026-095 Kitchenware stock arrival', user: staff2.id, daysAgo: 36 },
    { sku: 'WW-KIT-BLN-8123', type: 'In', qty: 25, prev: 0, next: 25, reason: 'PO-2026-096 Professional blenders pallet', user: staff.id, daysAgo: 35 },
    { sku: 'WW-AUT-HYD-5281', type: 'In', qty: 20, prev: 0, next: 20, reason: 'PO-2026-097 Automotive floor jacks intake', user: manager.id, daysAgo: 34 },
    { sku: 'WW-PAC-BOX-3291', type: 'In', qty: 150, prev: 0, next: 150, reason: 'PO-2026-098 Corrugated boxes bundle drop', user: staff3.id, daysAgo: 33 },

    // Order Stock Out Transactions
    { sku: 'WW-ELE-LAP-4819', type: 'Out', qty: 2, prev: 50, next: 48, reason: 'Order deduction for ORD-10101 (Apex Logistics)', user: staff.id, daysAgo: 28 },
    { sku: 'WW-ELE-MON-2104', type: 'Out', qty: 2, prev: 20, next: 18, reason: 'Order deduction for ORD-10101 (Apex Logistics)', user: staff.id, daysAgo: 28 },
    { sku: 'WW-FUR-ERG-7193', type: 'Out', qty: 4, prev: 40, next: 36, reason: 'Order deduction for ORD-10102 (TechCorp Global)', user: staff2.id, daysAgo: 25 },
    { sku: 'WW-FUR-DSK-5820', type: 'Out', qty: 2, prev: 20, next: 18, reason: 'Order deduction for ORD-10102 (TechCorp Global)', user: staff2.id, daysAgo: 25 },
    { sku: 'WW-ELE-HEA-9031', type: 'Out', qty: 5, prev: 80, next: 75, reason: 'Order deduction for ORD-10103 (Meridian Retail)', user: staff.id, daysAgo: 22 },
    { sku: 'WW-APP-VES-5120', type: 'Out', qty: 15, prev: 200, next: 185, reason: 'Order deduction for ORD-10104 (Summit Healthcare)', user: staff3.id, daysAgo: 20 },
    { sku: 'WW-APP-GLV-7731', type: 'Out', qty: 10, prev: 130, next: 120, reason: 'Order deduction for ORD-10104 (Summit Healthcare)', user: staff3.id, daysAgo: 20 },
    { sku: 'WW-ELE-LAP-4819', type: 'Out', qty: 3, prev: 48, next: 45, reason: 'Order deduction for ORD-10105 (Beacon Creative)', user: admin.id, daysAgo: 18 },
    { sku: 'WW-AUT-HYD-5281', type: 'Out', qty: 2, prev: 20, next: 18, reason: 'Order deduction for ORD-10106 (Vanguard Industrial)', user: staff.id, daysAgo: 16 },
    { sku: 'WW-FUR-BKC-6401', type: 'Out', qty: 2, prev: 25, next: 23, reason: 'Order deduction for ORD-10107 (Horizon Design)', user: staff2.id, daysAgo: 15 },
    { sku: 'WW-AUT-INF-9410', type: 'Out', qty: 6, prev: 45, next: 39, reason: 'Order deduction for ORD-10108 (Nova Fleet)', user: staff.id, daysAgo: 14 },
    { sku: 'WW-OFF-TON-4921', type: 'Out', qty: 2, prev: 15, next: 13, reason: 'Order deduction for ORD-10109 (Quantum Dynamics)', user: admin.id, daysAgo: 12 },
    { sku: 'WW-PAC-BOX-3291', type: 'Out', qty: 10, prev: 150, next: 140, reason: 'Order deduction for ORD-10111 (Metro Wholesale)', user: staff.id, daysAgo: 9 },
    { sku: 'WW-APP-VES-5120', type: 'Out', qty: 20, prev: 185, next: 165, reason: 'Order deduction for ORD-10112 (Pacific Freight)', user: staff2.id, daysAgo: 8 },

    // Return Restocks
    { sku: 'WW-PAC-BOX-3291', type: 'Return', qty: 1, prev: 140, next: 141, reason: 'Restocked returned items from return RET-20201', user: manager.id, daysAgo: 21 },
    { sku: 'WW-ELE-HEA-9031', type: 'Return', qty: 1, prev: 75, next: 76, reason: 'Restocked returned items from return RET-20202', user: admin.id, daysAgo: 16 },
    { sku: 'WW-APP-VES-5120', type: 'Return', qty: 2, prev: 165, next: 167, reason: 'Restocked returned items from return RET-20203', user: manager.id, daysAgo: 14 },
    { sku: 'WW-APP-BOT-2849', type: 'Return', qty: 1, prev: 8, next: 9, reason: 'Restocked returned items from return RET-20204', user: manager.id, daysAgo: 11 },
    { sku: 'WW-AUT-INF-9410', type: 'Return', qty: 1, prev: 39, next: 40, reason: 'Restocked returned items from return RET-20205', user: admin.id, daysAgo: 8 },
    { sku: 'WW-KIT-KET-1092', type: 'Return', qty: 1, prev: 31, next: 32, reason: 'Restocked returned items from return RET-20206', user: manager.id, daysAgo: 5 },

    // Audit Reconciliations
    { sku: 'WW-ELE-HEA-9031', type: 'Audit Reconciled', qty: 2, prev: 78, next: 76, reason: 'Reconciliation discrepancy from audit AUD-10492. Remarks: Sample order adjustment', user: admin.id, daysAgo: 39 },
    { sku: 'WW-FUR-DSK-5820', type: 'Audit Reconciled', qty: 1, prev: 20, next: 19, reason: 'Reconciliation discrepancy from audit AUD-21840. Remarks: Showroom display transfer', user: manager.id, daysAgo: 33 },
    { sku: 'WW-OFF-DES-3019', type: 'Audit Reconciled', qty: 2, prev: 100, next: 102, reason: 'Reconciliation discrepancy from audit AUD-33912. Remarks: Surplus boxes recovered', user: manager.id, daysAgo: 27 },
    { sku: 'WW-PAC-TAP-6523', type: 'Audit Reconciled', qty: 2, prev: 100, next: 98, reason: 'Reconciliation discrepancy from audit AUD-78192. Remarks: Damaged by water leak', user: admin.id, daysAgo: 7 },
  ];

  for (const trans of transactionPresets) {
    const prod = productMap.get(trans.sku);
    if (!prod) continue;

    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - trans.daysAgo);

    await prisma.transaction.create({
      data: {
        productId: prod.id,
        type: trans.type,
        quantity: trans.qty,
        previousQty: trans.prev,
        newQty: trans.next,
        reason: trans.reason,
        performedBy: trans.user,
        createdAt: createdAtDate,
        updatedAt: createdAtDate,
      },
    });
  }
  console.log('Successfully created 42 stock transactions.');

  // 7. System Audit & Security Logs (45 logs)
  console.log('7. Inserting 45 system audit and security logs...');
  const auditLogPresets = [
    { action: 'USER_REGISTER', details: 'Registered user: admin@whitewings.com with role Admin', user: admin, ip: '192.168.1.105', daysAgo: 45 },
    { action: 'USER_LOGIN', details: 'User logged in: admin@whitewings.com', user: admin, ip: '192.168.1.105', daysAgo: 45 },
    { action: 'USER_REGISTER', details: 'Registered user: manager@whitewings.com with role Warehouse Manager', user: manager, ip: '192.168.1.112', daysAgo: 44 },
    { action: 'USER_LOGIN', details: 'User logged in: manager@whitewings.com', user: manager, ip: '192.168.1.112', daysAgo: 44 },
    { action: 'USER_REGISTER', details: 'Registered user: staff@whitewings.com with role Staff', user: staff, ip: '10.0.4.55', daysAgo: 44 },
    { action: 'PRODUCT_CREATE', details: 'Created product: UltraSlim Pro 15" Laptop (WW-ELE-LAP-4819) and initialized inventory', user: admin, ip: '192.168.1.105', daysAgo: 44 },
    { action: 'PRODUCT_CREATE', details: 'Created product: Executive Ergonomic High-Back Mesh Chair (WW-FUR-ERG-7193)', user: manager, ip: '192.168.1.112', daysAgo: 43 },
    { action: 'STOCK_IN', details: 'In transaction of 50 units for UltraSlim Pro 15" Laptop. Old qty: 0, New qty: 50', user: manager, ip: '192.168.1.112', daysAgo: 43 },
    { action: 'STOCK_IN', details: 'In transaction of 40 units for Executive Ergonomic Chair. Old qty: 0, New qty: 40', user: manager, ip: '192.168.1.112', daysAgo: 43 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-10492 with 3 items', user: admin, ip: '192.168.1.105', daysAgo: 40 },
    { action: 'AUDIT_RECONCILE', details: 'Reconciled stock audit AUD-10492. Stock balance confirmed.', user: admin, ip: '192.168.1.105', daysAgo: 39 },
    { action: 'USER_LOGIN', details: 'User logged in: david.miller@whitewings.com', user: staff2, ip: '172.16.20.14', daysAgo: 35 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-21840 with 3 items', user: manager, ip: '192.168.1.112', daysAgo: 34 },
    { action: 'AUDIT_RECONCILE', details: 'Reconciled stock audit AUD-21840. Physical count approved.', user: manager, ip: '192.168.1.112', daysAgo: 33 },
    { action: 'ORDER_CREATE', details: 'Created order ORD-10101 for customer Apex Logistics LLC. Total: $3,274.98', user: staff, ip: '10.0.4.55', daysAgo: 28 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-33912 with 3 items', user: manager, ip: '192.168.1.112', daysAgo: 28 },
    { action: 'AUDIT_RECONCILE', details: 'Reconciled stock audit AUD-33912. Adjusted surplus.', user: manager, ip: '192.168.1.112', daysAgo: 27 },
    { action: 'ORDER_STATUS_UPDATE', details: 'Updated order ORD-10101 status from Pending to Shipped', user: staff2, ip: '172.16.20.14', daysAgo: 27 },
    { action: 'ORDER_CREATE', details: 'Created order ORD-10102 for customer TechCorp Global. Total: $2,154.00', user: staff2, ip: '172.16.20.14', daysAgo: 25 },
    { action: 'ORDER_STATUS_UPDATE', details: 'Updated order ORD-10101 status from Shipped to Delivered', user: admin, ip: '192.168.1.105', daysAgo: 24 },
    { action: 'ORDER_STATUS_UPDATE', details: 'Updated order ORD-10102 status from Pending to Shipped', user: staff2, ip: '172.16.20.14', daysAgo: 24 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-45201 with 3 items', user: admin, ip: '192.168.1.105', daysAgo: 22 },
    { action: 'ORDER_CREATE', details: 'Created order ORD-10103 for customer Meridian Retail Solutions. Total: $1,417.40', user: staff, ip: '10.0.4.55', daysAgo: 22 },
    { action: 'ORDER_STATUS_UPDATE', details: 'Updated order ORD-10102 status from Shipped to Delivered', user: manager, ip: '192.168.1.112', daysAgo: 22 },
    { action: 'AUDIT_RECONCILE', details: 'Reconciled stock audit AUD-45201', user: admin, ip: '192.168.1.105', daysAgo: 21 },
    { action: 'RETURN_INITIATE', details: 'Initiated return RET-20201 for order ORD-10101. Product: WW-PAC-BOX-3291, Qty: 1', user: staff, ip: '10.0.4.55', daysAgo: 21 },
    { action: 'RETURN_APPROVED_RESTOCKED', details: 'Processed return RET-20201 as Approved & Restocked', user: manager, ip: '192.168.1.112', daysAgo: 21 },
    { action: 'ORDER_CREATE', details: 'Created order ORD-10104 for customer Summit Healthcare. Total: $546.50', user: staff3, ip: '10.0.4.55', daysAgo: 20 },
    { action: 'ORDER_STATUS_UPDATE', details: 'Updated order ORD-10103 status from Shipped to Delivered', user: staff, ip: '10.0.4.55', daysAgo: 19 },
    { action: 'PRODUCT_UPDATE', details: 'Updated product: 27-Inch 4K UHD Curved Professional Monitor (WW-ELE-MON-2104)', user: manager, ip: '192.168.1.112', daysAgo: 19 },
    { action: 'ORDER_CREATE', details: 'Created order ORD-10105 for customer Beacon Creative Media. Total: $4,648.47', user: admin, ip: '192.168.1.105', daysAgo: 18 },
    { action: 'RETURN_REJECTED', details: 'Processed return RET-20208 as Rejected. Scuffed armrest.', user: manager, ip: '192.168.1.112', daysAgo: 18 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-57193 with 3 items', user: manager, ip: '192.168.1.112', daysAgo: 17 },
    { action: 'AUDIT_RECONCILE', details: 'Reconciled stock audit AUD-57193', user: manager, ip: '192.168.1.112', daysAgo: 16 },
    { action: 'RETURN_INITIATE', details: 'Initiated return RET-20202 for order ORD-10103. Product: WW-ELE-HEA-9031, Qty: 1', user: staff, ip: '10.0.4.55', daysAgo: 16 },
    { action: 'RETURN_APPROVED_RESTOCKED', details: 'Processed return RET-20202 as Approved & Restocked', user: admin, ip: '192.168.1.105', daysAgo: 16 },
    { action: 'ORDER_CREATE', details: 'Created order ORD-10106 for customer Vanguard Industrial. Total: $869.80', user: staff, ip: '10.0.4.55', daysAgo: 16 },
    { action: 'ORDER_STATUS_UPDATE', details: 'Updated order ORD-10105 status from Shipped to Delivered', user: staff, ip: '10.0.4.55', daysAgo: 15 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-69024 with 3 items', user: manager, ip: '192.168.1.112', daysAgo: 12 },
    { action: 'AUDIT_RECONCILE', details: 'Reconciled stock audit AUD-69024', user: manager, ip: '192.168.1.112', daysAgo: 11 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-78192 with 3 items', user: admin, ip: '192.168.1.105', daysAgo: 8 },
    { action: 'AUDIT_RECONCILE', details: 'Reconciled stock audit AUD-78192', user: admin, ip: '192.168.1.105', daysAgo: 7 },
    { action: 'USER_LOGIN', details: 'User logged in: manager@whitewings.com', user: manager, ip: '192.168.1.112', daysAgo: 2 },
    { action: 'AUDIT_START', details: 'Started stock audit AUD-88401 with 3 items', user: manager, ip: '192.168.1.112', daysAgo: 2 },
    { action: 'USER_LOGIN', details: 'User logged in: admin@whitewings.com', user: admin, ip: '192.168.1.105', daysAgo: 0 },
  ];

  for (const log of auditLogPresets) {
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - log.daysAgo);

    await prisma.auditLog.create({
      data: {
        userId: log.user.id,
        userName: log.user.name,
        action: log.action,
        details: log.details,
        ipAddress: log.ip,
        createdAt: createdAtDate,
      },
    });
  }
  console.log('Successfully created 45 audit logs.');

  console.log('--- Database Seeding Completed Successfully! ---');
}

seed()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

