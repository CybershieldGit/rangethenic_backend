import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    images: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    subCategory: {
      type: String,
      default: '',
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isBestSeller: {
      type: Boolean,
      required: true,
      default: false,
    },
    isCODAllowed: {
      type: Boolean,
      required: true,
      default: true,
    },
    weight: {
      type: Number,
      default: 0.5,
      min: 0.1,
    },
    length: {
      type: Number,
      default: 10,
      min: 1,
    },
    breadth: {
      type: Number,
      default: 10,
      min: 1,
    },
    height: {
      type: Number,
      default: 10,
      min: 1,
    },
    sku: {
      type: String,
      default: '',
    },
    hsnCode: {
      type: Number,
      default: 33049990,
    },
    isFeatured: {
      type: Boolean,
      required: true,
      default: false,
    },
    video: {
      type: String,
      default: '',
    },
    sizes: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    fabrics: {
      type: [String],
      default: [],
    },
    works: {
      type: [String],
      default: [],
    },
    reviews: [reviewSchema],
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Synchronize image and images array
productSchema.pre('save', function (next) {
  if (this.images && this.images.length > 0 && !this.image) {
    this.image = this.images[0];
  } else if (this.image && (!this.images || this.images.length === 0)) {
    this.images = [this.image];
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', category: 'text' });
productSchema.index({ isBestSeller: 1 });
productSchema.index({ isFeatured: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
