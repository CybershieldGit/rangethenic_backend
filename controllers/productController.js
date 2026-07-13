import Product from '../models/Product.js';
import { getIO } from '../utils/socket.js';

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 50;
    const page = Number(req.query.pageNumber) || 1;

    const filter = {};

    if (req.query.keyword) {
      filter.$or = [
        { name: { $regex: req.query.keyword, $options: 'i' } },
        { shortDescription: { $regex: req.query.keyword, $options: 'i' } },
        { longDescription: { $regex: req.query.keyword, $options: 'i' } },
        { category: { $regex: req.query.keyword, $options: 'i' } },
      ];
    }

    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: 'i' };
    }

    if (req.query.occasion) {
      filter.occasion = req.query.occasion;
    }

    const count = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize) });
  } catch (error) {
    console.error('Error in getProducts:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch distinct categories with count and sample image
// @route   GET /api/products/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          image: { $first: '$image' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(
      categories.map((c) => ({
        name: c._id,
        count: c.count,
        image: c.image,
      }))
    );
  } catch (error) {
    console.error('Error in getCategories:', error);
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
      res.json(product);
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
  const products = await Product.find({ isBestSeller: true });
  res.json(products);
};

// @desc    Fetch all featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProduct = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true });
    res.json(products);
  } catch (error) {
    console.error('Error in getFeaturedProduct:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  const { name, price, discountPercentage, shortDescription, longDescription, images, image, category, subCategory, countInStock, isBestSeller, isCODAllowed, isFeatured, video, sizes, colors, fabrics, works, metals, jewelColors, occasion } = req.body;



  const product = new Product({
    name,
    price,
    discountPercentage: discountPercentage !== undefined ? discountPercentage : 0,
    user: req.user._id,
    images: images || (image ? [image] : []),
    image: image || (images && images.length > 0 ? images[0] : ''),
    category,
    subCategory: subCategory || '',
    countInStock,
    shortDescription: shortDescription || '',
    longDescription: longDescription || '',
    isBestSeller: isBestSeller !== undefined ? isBestSeller : false,
    isCODAllowed: isCODAllowed !== undefined ? isCODAllowed : true,
    isFeatured: isFeatured !== undefined ? isFeatured : false,
    video: video || '',
    sizes: sizes || [],
    colors: colors || [],
    fabrics: fabrics || [],
    works: works || [],
    metals: metals || [],
    jewelColors: jewelColors || [],
    occasion: occasion || '',
  });

  const createdProduct = await product.save();

  // Emit websocket event for product creation
  const io = getIO();
  if (io) {
    io.emit('productCreated', createdProduct);
  }

  res.status(201).json(createdProduct);
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { name, price, discountPercentage, shortDescription, longDescription, images, image, category, subCategory, countInStock, isBestSeller, isCODAllowed, isFeatured, video, sizes, colors, fabrics, works, metals, jewelColors, occasion } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price || product.price;
      if (discountPercentage !== undefined) {
        product.discountPercentage = discountPercentage;
      }
      if (shortDescription !== undefined) {
        product.shortDescription = shortDescription;
      }
      if (longDescription !== undefined) {
        product.longDescription = longDescription;
      }
      
      // Update images array and single image field
      if (images) {
        product.images = images;
        product.image = images[0] || product.image;
      } else if (image) {
        product.image = image;
        product.images = [image];
      }

      product.category = category || product.category;
      if (subCategory !== undefined) {
        product.subCategory = subCategory;
      }
      product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;
      product.isBestSeller = isBestSeller !== undefined ? isBestSeller : product.isBestSeller;
      product.isCODAllowed = isCODAllowed !== undefined ? isCODAllowed : product.isCODAllowed;

      // Update video URL
      if (video !== undefined) {
        product.video = video;
      }
      if (isFeatured !== undefined) {
        product.isFeatured = isFeatured;
      }

      if (sizes !== undefined) {
        product.sizes = sizes;
      }
      if (colors !== undefined) {
        product.colors = colors;
      }
      if (fabrics !== undefined) {
        product.fabrics = fabrics;
      }
      if (works !== undefined) {
        product.works = works;
      }
      if (metals !== undefined) {
        product.metals = metals;
      }
      if (jewelColors !== undefined) {
        product.jewelColors = jewelColors;
      }
      if (occasion !== undefined) {
        product.occasion = occasion;
      }

      const updatedProduct = await product.save();

      // Emit websocket event for product update
      const io = getIO();
      if (io) {
        io.emit('productUpdated', updatedProduct);
      }

      res.json(updatedProduct);
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

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: 'Product already reviewed' });
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);

      product.numReviews = product.reviews.length;

      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      const updatedProduct = await product.save();

      // Emit websocket event for product updates
      const io = getIO();
      if (io) {
        io.emit('productUpdated', updatedProduct);
      }

      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error('Error in createProductReview:', error);
    res.status(500).json({ message: error.message });
  }
};

export {
  getProducts,
  getProductById,
  getBestProducts,
  getFeaturedProduct,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
};
