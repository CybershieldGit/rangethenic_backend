import Attribute from '../models/Attribute.js';

// @desc    Get all attributes
// @route   GET /api/attributes
// @access  Public
export const getAttributes = async (req, res) => {
  try {
    const query = {};
    if (req.query.type) {
      query.type = req.query.type;
    }
    const attributes = await Attribute.find(query).sort({ value: 1 });
    res.json(attributes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new attribute
// @route   POST /api/attributes
// @access  Private/Admin
export const createAttribute = async (req, res) => {
  try {
    const { type, value } = req.body;

    if (!type || !value) {
      return res.status(400).json({ message: 'Type and value are required.' });
    }

    const trimmedValue = value.trim();
    
    // Check for duplicates
    const exists = await Attribute.findOne({ type, value: { $regex: new RegExp(`^${trimmedValue}$`, 'i') } });
    if (exists) {
      return res.status(400).json({ message: `Attribute '${trimmedValue}' already exists for type '${type}'.` });
    }

    const attribute = new Attribute({
      type,
      value: trimmedValue,
    });

    const createdAttribute = await attribute.save();
    res.status(201).json(createdAttribute);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an attribute
// @route   DELETE /api/attributes/:id
// @access  Private/Admin
export const deleteAttribute = async (req, res) => {
  try {
    const attribute = await Attribute.findById(req.params.id);

    if (attribute) {
      await attribute.deleteOne();
      res.json({ message: 'Attribute value removed.' });
    } else {
      res.status(404).json({ message: 'Attribute not found.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
