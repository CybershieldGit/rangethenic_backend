import mongoose from 'mongoose';

const attributeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['size', 'color', 'fabric', 'work'],
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate values for the same type
attributeSchema.index({ type: 1, value: 1 }, { unique: true });

const Attribute = mongoose.model('Attribute', attributeSchema);

export default Attribute;
