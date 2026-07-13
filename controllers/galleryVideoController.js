import GalleryVideo from '../models/GalleryVideo.js';

// @desc    Get all gallery videos
// @route   GET /api/gallery-videos
// @access  Public
export const getGalleryVideos = async (req, res, next) => {
  try {
    const videos = await GalleryVideo.find({}).sort({ createdAt: -1 });
    res.status(200).json(videos);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a gallery video
// @route   POST /api/gallery-videos
// @access  Private/Admin
export const createGalleryVideo = async (req, res, next) => {
  try {
    const { url, publicId, title } = req.body;

    if (!url) {
      return res.status(400).json({ message: 'Video URL is required' });
    }

    const video = await GalleryVideo.create({
      url,
      publicId,
      title,
    });

    res.status(201).json({
      message: 'Video added successfully',
      video,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a gallery video
// @route   DELETE /api/gallery-videos/:id
// @access  Private/Admin
export const deleteGalleryVideo = async (req, res, next) => {
  try {
    const video = await GalleryVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    await GalleryVideo.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Video removed successfully' });
  } catch (error) {
    next(error);
  }
};
