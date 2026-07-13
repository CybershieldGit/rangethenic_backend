import './config/env.js';
import mongoose from 'mongoose';
import GalleryVideo from './models/GalleryVideo.js';

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB!");
    const videos = await GalleryVideo.find({});
    console.log("Videos found:", videos);
  } catch (error) {
    console.error("Error running test:", error);
  } finally {
    await mongoose.disconnect();
  }
}

test();
