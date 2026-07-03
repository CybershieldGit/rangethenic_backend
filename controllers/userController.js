import User from '../models/User.js';
import { normalizeAddress } from '../utils/address.js';

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        address: user.address,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.email) {
        user.email = req.body.email;
      }
      if (req.body.password) {
        user.password = req.body.password;
      }
      
      // Update address object
      if (req.body.address) {
        const normalized = normalizeAddress({
          ...user.address.toObject?.() || user.address,
          ...req.body.address,
        });
        Object.assign(user.address, normalized);
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        address: updatedUser.address,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};


const serializeAddress = (addr) => ({
  id: addr._id.toString(),
  label: addr.label || '',
  fullName: addr.fullName || '',
  phone: addr.phone || '',
  houseFlatNo: addr.houseFlatNo || '',
  streetArea: addr.streetArea || '',
  landmark: addr.landmark || '',
  addressLine: addr.addressLine || '',
  city: addr.city || '',
  state: addr.state || '',
  postalCode: addr.postalCode || '',
  country: addr.country || '',
  isDefault: Boolean(addr.isDefault),
});

// @desc    Get all saved addresses for the logged-in user
// @route   GET /api/users/addresses
// @access  Private
const getUserAddresses = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    res.json((user.addresses || []).map(serializeAddress));
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new saved address
// @route   POST /api/users/addresses
// @access  Private
const addUserAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const normalized = normalizeAddress(req.body);
    const makeDefault = Boolean(req.body.isDefault) || user.addresses.length === 0;

    if (makeDefault) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
    }

    user.addresses.push({
      ...normalized,
      label: (req.body.label || '').trim(),
      isDefault: makeDefault,
    });

    await user.save();
    res.status(201).json(user.addresses.map(serializeAddress));
  } catch (error) {
    next(error);
  }
};

// @desc    Update an existing saved address
// @route   PUT /api/users/addresses/:addressId
// @access  Private
const updateUserAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      res.status(404);
      throw new Error('Address not found');
    }

    const normalized = normalizeAddress({ ...address.toObject(), ...req.body });
    Object.assign(address, normalized);
    if (typeof req.body.label === 'string') address.label = req.body.label.trim();

    if (Boolean(req.body.isDefault)) {
      user.addresses.forEach((a) => {
        a.isDefault = a._id.toString() === address._id.toString();
      });
    }

    // Ensure at least one default remains.
    if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json(user.addresses.map(serializeAddress));
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a saved address
// @route   DELETE /api/users/addresses/:addressId
// @access  Private
const deleteUserAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      res.status(404);
      throw new Error('Address not found');
    }

    const wasDefault = address.isDefault;
    address.deleteOne();

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    res.json(user.addresses.map(serializeAddress));
  } catch (error) {
    next(error);
  }
};

// @desc    Get user wishlist
// @route   GET /api/users/wishlist
// @access  Private
const getUserWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');

    if (user) {
      res.json(user.wishlist || []);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Add product to wishlist
// @route   POST /api/users/wishlist
// @access  Private
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      if (user.wishlist.includes(productId)) {
        res.status(400);
        throw new Error('Product already in wishlist');
      }

      user.wishlist.push(productId);
      await user.save();

      // Return updated, populated wishlist
      const updatedUser = await User.findById(req.user._id).populate('wishlist');
      res.json(updatedUser.wishlist);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Remove product from wishlist
// @route   DELETE /api/users/wishlist/:productId
// @access  Private
const removeFromWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.wishlist = user.wishlist.filter(
        (id) => id.toString() !== req.params.productId
      );
      await user.save();

      // Return updated, populated wishlist
      const updatedUser = await User.findById(req.user._id).populate('wishlist');
      res.json(updatedUser.wishlist);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Clear the entire wishlist
// @route   DELETE /api/users/wishlist
// @access  Private
const clearWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.wishlist = [];
      await user.save();
      res.json([]);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

export {
  getUserProfile,
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
};

