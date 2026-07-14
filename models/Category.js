import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    subcategories: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },
          image: {
            type: String,
            default: '',
          },
        }
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
