import Product from '../models/Product.js';
import { getIO } from '../utils/socket.js';
import { getReservedStock, getReservedStocksForProducts } from '../utils/stockHelper.js';

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const pageSize = 8;
    const page = Number(req.query.pageNumber) || 1;

    const filter = {};

    if (req.query.keyword) {
      filter.$or = [
        { name: { $regex: req.query.keyword, $options: 'i' } },
        { description: { $regex: req.query.keyword, $options: 'i' } },
        { category: { $regex: req.query.category, $options: 'i' } },
      ];
    }

    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: 'i' };
    }

    const count = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    // Get reserved stocks for these products
    const productIds = products.map(p => p._id);
    const reservedMap = await getReservedStocksForProducts(productIds);
    
    // Map products to include reservedCount
    const productsWithReserved = products.map(p => {
      const pObj = p.toObject();
      pObj.reservedCount = reservedMap[p._id.toString()] || 0;
      return pObj;
    });

    res.json({ products: productsWithReserved, page, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    console.error('Error in getProducts:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      const reservedCount = await getReservedStock(product._id);
      const productObj = product.toObject();
      productObj.reservedCount = reservedCount;
      res.json(productObj);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error in getProductById:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch best seller products
// @route   GET /api/products/best
// @access  Public
const getBestProducts = async (req, res) => {
  try {
    const products = await Product.find({ isBestSeller: true });
    const productIds = products.map(p => p._id);
    const reservedMap = await getReservedStocksForProducts(productIds);
    const productsWithReserved = products.map(p => {
      const pObj = p.toObject();
      pObj.reservedCount = reservedMap[p._id.toString()] || 0;
      return pObj;
    });
    res.json(productsWithReserved);
  } catch (error) {
    console.error('Error in getBestProducts:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  const { name, price, description, images, image, category, countInStock, isBestSeller, isCODAllowed } = req.body;

  const product = new Product({
    name,
    price,
    user: req.user._id,
    images: images || (image ? [image] : []),
    image: image || (images && images.length > 0 ? images[0] : ''),
    category,
    countInStock,
    description,
    isBestSeller: isBestSeller !== undefined ? isBestSeller : false,
    isCODAllowed: isCODAllowed !== undefined ? isCODAllowed : true,
  });

  const createdProduct = await product.save();
  const productObj = createdProduct.toObject();
  productObj.reservedCount = 0;

  // Emit websocket event for product creation
  const io = getIO();
  if (io) {
    io.emit('productCreated', productObj);
  }

  res.status(201).json(productObj);
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { name, price, description, images, image, category, countInStock, isBestSeller, isCODAllowed } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price || product.price;
      product.description = description || product.description;
      
      // Update images array and single image field
      if (images) {
        product.images = images;
        product.image = images[0] || product.image;
      } else if (image) {
        product.image = image;
        product.images = [image];
      }

      product.category = category || product.category;
      product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;
      product.isBestSeller = isBestSeller !== undefined ? isBestSeller : product.isBestSeller;
      product.isCODAllowed = isCODAllowed !== undefined ? isCODAllowed : product.isCODAllowed;

      const updatedProduct = await product.save();
      const reservedCount = await getReservedStock(updatedProduct._id);
      const productObj = updatedProduct.toObject();
      productObj.reservedCount = reservedCount;

      // Emit websocket event for product update
      const io = getIO();
      if (io) {
        io.emit('productUpdated', productObj);
      }

      res.json(productObj);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error in updateProduct:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne();

      // Emit websocket event for product deletion
      const io = getIO();
      if (io) {
        io.emit('productDeleted', req.params.id);
      }

      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error in deleteProduct:', error);
    res.status(500).json({ message: error.message });
  }
};

export {
  getProducts,
  getProductById,
  getBestProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
