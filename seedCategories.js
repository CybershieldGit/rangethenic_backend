import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';

dotenv.config();

// The two main categories with their default subcategories.
const DEFAULT_CATEGORIES = [
  {
    name: 'Clothing',
    description: 'Ethnic wear and apparel',
    subcategories: ['Sarees', 'Lehengas', 'Kurtis', 'Suits', 'Dupattas', 'Gowns'],
  },
  {
    name: 'Jewellery',
    description: 'Handcrafted jewellery',
    subcategories: ['Necklaces', 'Earrings', 'Bangles', 'Rings', 'Anklets', 'Pendants'],
  },
];

const seedCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Database connected.');

    for (const def of DEFAULT_CATEGORIES) {
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${def.name}$`, 'i') },
      });

      if (existing) {
        // Merge any missing subcategories without removing existing ones.
        const current = new Set(existing.subcategories.map((s) => s.toLowerCase()));
        const merged = [...existing.subcategories];
        for (const sub of def.subcategories) {
          if (!current.has(sub.toLowerCase())) merged.push(sub);
        }
        existing.subcategories = merged;
        await existing.save();
        console.log(`Updated category "${existing.name}" (subcategories: ${merged.join(', ')})`);
      } else {
        const created = await Category.create(def);
        console.log(`Created category "${created.name}" (subcategories: ${created.subcategories.join(', ')})`);
      }
    }

    console.log('Category seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
};

seedCategories();
