import mongoose from 'mongoose';

const galleryVideoSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const GalleryVideo = mongoose.models.GalleryVideo || mongoose.model('GalleryVideo', galleryVideoSchema);
export default GalleryVideo;
