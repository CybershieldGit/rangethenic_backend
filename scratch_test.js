import './config/env.js';
import mongoose from 'mongoose';
import Category from './models/Category.js';

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB!");
    const categories = await Category.collection.find({}).toArray();
    for (const category of categories) {
      let updated = false;
      const migratedSubs = (category.subcategories || []).map(sub => {
        if (typeof sub === 'string') {
          updated = true;
          let image = '';
          const lsub = sub.toLowerCase();
          if (lsub === 'sarees' || lsub === 'saree') image = '/images/sarees.png';
          else if (lsub === 'lehengas' || lsub === 'lehenga' || lsub === 'lahnga') image = '/images/Lehengas.png';
          else if (lsub === 'dupattas' || lsub === 'dupatta') image = '/images/Dupattas.png';
          else if (lsub === 'kurta sets' || lsub === 'kurta set' || lsub === 'kurtis' || lsub === 'kurti') image = '/images/Kurta_Sets.png';
          return { name: sub, image };
        }
        return sub;
      });
      if (updated) {
        await Category.collection.updateOne({ _id: category._id }, { $set: { subcategories: migratedSubs } });
        console.log(`[Migration] Converted subcategories for ${category.name}`);
      }
    }
    console.log("Migration complete!");
  } catch (error) {
    console.error("Error running test:", error);
  } finally {
    await mongoose.disconnect();
  }
}

test();
