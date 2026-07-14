import Category from '../models/Category.js';
import Product from '../models/Product.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error in getCategories:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const { name, description, subcategories } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    // Check if category already exists (case-insensitive)
    const existing = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });

    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    // Normalize subcategories: trim, drop empties, de-duplicate (case-insensitive)
    let subs = [];
    if (Array.isArray(subcategories)) {
      const seen = new Set();
      for (const s of subcategories) {
        let name = '';
        let image = '';
        if (typeof s === 'string') {
          name = s.trim();
        } else if (s && typeof s === 'object' && s.name) {
          name = s.name.trim();
          image = s.image ? s.image.trim() : '';
        }
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        subs.push({ name, image });
      }
    }

    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      subcategories: subs,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error in createCategory:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a subcategory to a category
// @route   POST /api/categories/:id/subcategories
// @access  Private/Admin
const addSubcategory = async (req, res) => {
  try {
    const { name, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Subcategory name is required' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const trimmed = name.trim();
    const exists = category.subcategories.some((s) => {
      const subName = typeof s === 'string' ? s : (s?.name || '');
      return subName.toLowerCase() === trimmed.toLowerCase();
    });

    if (exists) {
      return res.status(400).json({ message: 'Subcategory already exists in this category' });
    }

    category.subcategories.push({ name: trimmed, image: image ? image.trim() : '' });
    const updated = await category.save();

    res.status(201).json(updated);
  } catch (error) {
    console.error('Error in addSubcategory:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove a subcategory from a category
// @route   DELETE /api/categories/:id/subcategories
// @access  Private/Admin
const deleteSubcategory = async (req, res) => {
  try {
    const name = req.body.name || req.query.name;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Subcategory name is required' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const trimmed = name.trim();
    category.subcategories = category.subcategories.filter((s) => {
      const subName = typeof s === 'string' ? s : (s?.name || '');
      return subName.toLowerCase() !== trimmed.toLowerCase();
    });
    const updated = await category.save();

    // Clear this subcategory from any products that used it
    await Product.updateMany(
      { category: category.name, subCategory: trimmed },
      { subCategory: '' }
    );

    res.json(updated);
  } catch (error) {
    console.error('Error in deleteSubcategory:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a subcategory name and/or image
// @route   PUT /api/categories/:id/subcategories
// @access  Private/Admin
const updateSubcategory = async (req, res) => {
  try {
    const { oldName, newName, image } = req.body;

    if (!oldName || !oldName.trim()) {
      return res.status(400).json({ message: 'Current subcategory name is required (oldName)' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const trimmedOld = oldName.trim();
    const subIndex = category.subcategories.findIndex((s) => {
      const subName = typeof s === 'string' ? s : (s?.name || '');
      return subName.toLowerCase() === trimmedOld.toLowerCase();
    });

    if (subIndex === -1) {
      return res.status(404).json({ message: 'Subcategory not found' });
    }

    // Prepare updated subcategory object
    const updatedSub = { ...category.subcategories[subIndex].toObject() };

    if (newName && newName.trim()) {
      const trimmedNew = newName.trim();
      if (trimmedNew.toLowerCase() !== trimmedOld.toLowerCase()) {
        const exists = category.subcategories.some((s) => {
          const subName = typeof s === 'string' ? s : (s?.name || '');
          return subName.toLowerCase() === trimmedNew.toLowerCase();
        });
        if (exists) {
          return res.status(400).json({ message: 'A subcategory with that name already exists' });
        }
      }
      updatedSub.name = trimmedNew;
    }

    if (image !== undefined) {
      updatedSub.image = image.trim();
    }

    category.subcategories[subIndex] = updatedSub;
    category.markModified('subcategories');
    const updated = await category.save();

    // If subcategory name changed, update subCategory field of all products
    if (newName && newName.trim() && newName.trim().toLowerCase() !== trimmedOld.toLowerCase()) {
      await Product.updateMany(
        { category: category.name, subCategory: trimmedOld },
        { subCategory: newName.trim() }
      );
    }

    res.json(updated);
  } catch (error) {
    console.error('Error in updateSubcategory:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      await category.deleteOne();
      res.json({ message: 'Category removed' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error in deleteCategory:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const category = await Category.findById(req.params.id);

    if (category) {
      const oldName = category.name;
      const newName = name ? name.trim() : category.name;

      if (newName !== oldName) {
        // Check if category already exists (case-insensitive)
        const existing = await Category.findOne({ 
          name: { $regex: new RegExp(`^${newName}$`, 'i') },
          _id: { $ne: category._id }
        });

        if (existing) {
          return res.status(400).json({ message: 'Category name already exists' });
        }
      }

      category.name = newName;
      category.description = description !== undefined ? description : category.description;

      const updatedCategory = await category.save();

      // If name changed, update category field of all products
      if (newName !== oldName) {
        await Product.updateMany({ category: oldName }, { category: newName });
      }

      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error('Error in updateCategory:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Shift products from one category to another
// @route   POST /api/categories/shift
// @access  Private/Admin
const shiftCategoryProducts = async (req, res) => {
  try {
    const { sourceCategory, destinationCategory, productIds } = req.body;

    if (!sourceCategory || !destinationCategory) {
      return res.status(400).json({ message: 'Source and destination categories are required' });
    }

    if (sourceCategory === destinationCategory) {
      return res.status(400).json({ message: 'Source and destination categories must be different' });
    }

    // Verify destination category exists
    const destExists = await Category.findOne({ name: destinationCategory });
    if (!destExists) {
      return res.status(404).json({ message: `Destination category "${destinationCategory}" not found` });
    }

    let filter = { category: sourceCategory };
    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      filter._id = { $in: productIds };
    }

    const result = await Product.updateMany(filter, { category: destinationCategory });

    res.json({ 
      message: `Successfully shifted products to "${destinationCategory}"`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error in shiftCategoryProducts:', error);
    res.status(500).json({ message: error.message });
  }
};

export {
  getCategories,
  createCategory,
  addSubcategory,
  deleteSubcategory,
  updateSubcategory,
  deleteCategory,
  updateCategory,
  shiftCategoryProducts,
};
