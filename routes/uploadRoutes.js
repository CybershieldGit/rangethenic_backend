import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Configure Multer to use memory storage (avoids writing files to the local disk)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // limit file size to 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are permitted!'), false);
    }
  }
});

// @desc    Upload an image or video to Cloudinary
// @route   POST /api/upload
// @access  Public (or Admin protected)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image or video file to upload.' });
    }

    // Direct buffer upload to Cloudinary stream
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'rakarituals',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const result = await uploadToCloudinary();
    res.status(200).json({ 
      message: 'Media uploaded successfully.',
      url: result.secure_url 
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    res.status(500).json({ message: error.message || 'Image upload failed.' });
  }
});

export default router;
