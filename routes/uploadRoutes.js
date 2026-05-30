import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Configure Multer to use memory storage (avoids writing files to the local disk)
const storage = multer.memoryStorage();

// Image upload multer config (5MB limit)
const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are permitted!'), false);
    }
  }
});

// Video upload multer config (50MB limit)
const videoUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // limit file size to 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are permitted!'), false);
    }
  }
});

// @desc    Upload an image to Cloudinary
// @route   POST /api/upload
// @access  Public (or Admin protected)
router.post('/', imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image file to upload.' });
    }

    // Direct buffer upload to Cloudinary stream
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'Raakarituals',
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
      message: 'Image uploaded successfully.',
      url: result.secure_url
    });
  } catch (error) {
    console.error('Cloudinary Upload Error:', error);
    res.status(500).json({ message: error.message || 'Image upload failed.' });
  }
});

// @desc    Upload a video to Cloudinary (max 50MB)
// @route   POST /api/upload/video
// @access  Public (or Admin protected)
router.post('/video', (req, res, next) => {
  videoUpload.single('video')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Video file size exceeds the 50MB limit.' });
      }
      return res.status(400).json({ message: err.message || 'Video upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please select a video file to upload.' });
    }

    // Direct buffer upload to Cloudinary stream
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'Raakarituals/videos',
            resource_type: 'video',
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
      message: 'Video uploaded successfully.',
      url: result.secure_url
    });
  } catch (error) {
    console.error('Cloudinary Video Upload Error:', error);
    res.status(500).json({ message: error.message || 'Video upload failed.' });
  }
});

export default router;
