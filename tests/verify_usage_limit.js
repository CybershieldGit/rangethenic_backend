import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Coupon from '../models/Coupon.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';

dotenv.config();

const runTests = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Clean up any stale test items
    await User.deleteMany({ email: /test_.*@example\.com/ });
    await Coupon.deleteMany({ code: /TEST.*/ });
    await Product.deleteMany({ name: /Test Product.*/ });

    // 1. Create a test admin user
    console.log("\n--- Creating Test Admin ---");
    const admin = await User.create({
      name: "Test Admin",
      email: "test_admin_limit@example.com",
      password: "password123",
      isAdmin: true,
      isVerified: true
    });
    console.log(`Created Admin: ${admin._id}`);

    // 2. Create a product
    console.log("\n--- Creating Test Product ---");
    const product = await Product.create({
      name: "Test Product",
      price: 200,
      description: "Product owned by Admin",
      user: admin._id,
      category: "General",
      countInStock: 10,
      image: "/images/sample.jpg"
    });
    console.log(`Product created with price: ₹${product.price}`);

    // 3. Create a Coupon with usageLimit = 2
    console.log("\n--- Creating Coupon with Limit 2 ---");
    const coupon = await Coupon.create({
      code: "TESTLIMIT2",
      discountType: "fixed",
      discountValue: 50,
      minPurchase: 100,
      isActive: true,
      admin: admin._id,
      usageLimit: 2,
      usedCount: 0
    });
    console.log(`Coupon created: ${coupon.code} (Limit: ${coupon.usageLimit}, usedCount: ${coupon.usedCount})`);

    // Let's mock order helper logic similar to the backend
    const checkCouponValidity = async (code, cartItems) => {
      const dbCoupon = await Coupon.findOne({ code });
      if (!dbCoupon) throw new Error('Coupon code is invalid or does not exist');
      if (!dbCoupon.isActive) throw new Error('Coupon code is inactive');
      if (dbCoupon.expiryDate && new Date(dbCoupon.expiryDate) < new Date()) {
        throw new Error('Coupon code has expired');
      }
      if (dbCoupon.usageLimit && dbCoupon.usedCount >= dbCoupon.usageLimit) {
        throw new Error('Coupon usage limit has been reached');
      }
      
      let matchingSubtotal = 0;
      cartItems.forEach((item) => {
        if (item.product.user.toString() === dbCoupon.admin.toString()) {
          matchingSubtotal += item.product.price * item.quantity;
        }
      });
      if (matchingSubtotal < dbCoupon.minPurchase) {
        throw new Error(`Minimum purchase of ₹${dbCoupon.minPurchase} is required for this coupon`);
      }
      return dbCoupon;
    };

    const placeOrder = async (couponCode) => {
      const cartItems = [{ product, quantity: 1 }];
      let appliedCoupon = null;
      let couponDiscount = 0;

      if (couponCode) {
        appliedCoupon = await checkCouponValidity(couponCode, cartItems);
        couponDiscount = appliedCoupon.discountValue;
      }

      const order = await Order.create({
        user: admin._id,
        orderItems: cartItems.map(item => ({
          product: item.product._id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price
        })),
        totalPrice: 200 - couponDiscount,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        couponDiscount,
        shippingAddress: {
          fullName: "Test Customer",
          phone: "9876543210",
          addressLine: "123 Mystic Rd",
          city: "Mumbai",
          state: "Maharashtra",
          postalCode: "400001",
          country: "India"
        },
        paymentMethod: "COD",
        paymentStatus: "COD"
      });

      if (appliedCoupon) {
        appliedCoupon.usedCount = (appliedCoupon.usedCount || 0) + 1;
        await appliedCoupon.save();
      }

      return order;
    };

    // Scenario 1: Initial validation should pass
    console.log("\n--- Scenario 1: First Validation & Checkout ---");
    await checkCouponValidity("TESTLIMIT2", [{ product, quantity: 1 }]);
    console.log("Success: First validation passed.");
    
    const order1 = await placeOrder("TESTLIMIT2");
    console.log(`Placed order 1: ${order1._id}`);
    
    let updatedCoupon = await Coupon.findById(coupon._id);
    console.log(`Coupon usedCount: ${updatedCoupon.usedCount} (Expected: 1)`);
    if (updatedCoupon.usedCount !== 1) throw new Error("usedCount should be 1");

    // Scenario 2: Second validation & checkout should pass
    console.log("\n--- Scenario 2: Second Validation & Checkout ---");
    await checkCouponValidity("TESTLIMIT2", [{ product, quantity: 1 }]);
    console.log("Success: Second validation passed.");
    
    const order2 = await placeOrder("TESTLIMIT2");
    console.log(`Placed order 2: ${order2._id}`);
    
    updatedCoupon = await Coupon.findById(coupon._id);
    console.log(`Coupon usedCount: ${updatedCoupon.usedCount} (Expected: 2)`);
    if (updatedCoupon.usedCount !== 2) throw new Error("usedCount should be 2");

    // Scenario 3: Third validation should fail (Limit reached)
    console.log("\n--- Scenario 3: Third Validation (Should Fail) ---");
    try {
      await checkCouponValidity("TESTLIMIT2", [{ product, quantity: 1 }]);
      throw new Error("Validation succeeded but should have failed");
    } catch (err) {
      console.log(`Success: Validation failed as expected: "${err.message}"`);
      if (err.message !== 'Coupon usage limit has been reached') {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    // Scenario 4: Third checkout should fail
    console.log("\n--- Scenario 4: Third Checkout (Should Fail) ---");
    try {
      await placeOrder("TESTLIMIT2");
      throw new Error("Checkout succeeded but should have failed");
    } catch (err) {
      console.log(`Success: Checkout failed as expected: "${err.message}"`);
      if (err.message !== 'Coupon usage limit has been reached') {
        throw new Error(`Unexpected error message: ${err.message}`);
      }
    }

    // Scenario 5: Order cancellation should decrement usedCount
    console.log("\n--- Scenario 5: Cancel Order 2 & Verify usedCount decrements ---");
    // Simulate order cancellation logic
    order2.deliveryStatus = 'Cancelled';
    order2.cancelReason = 'Test Cancellation';
    await order2.save();
    
    if (order2.couponCode) {
      await Coupon.updateOne(
        { code: order2.couponCode },
        { $inc: { usedCount: -1 } }
      );
    }
    
    updatedCoupon = await Coupon.findById(coupon._id);
    console.log(`Coupon usedCount after cancellation: ${updatedCoupon.usedCount} (Expected: 1)`);
    if (updatedCoupon.usedCount !== 1) throw new Error("usedCount should be 1 after cancellation");

    // Scenario 6: Validation should succeed again
    console.log("\n--- Scenario 6: Fourth Validation (Should Pass after cancel) ---");
    await checkCouponValidity("TESTLIMIT2", [{ product, quantity: 1 }]);
    console.log("Success: Validation passed after order cancellation.");

    // Clean up
    console.log("\n--- Cleaning Up Database ---");
    await Order.deleteMany({ user: admin._id });
    await User.deleteMany({ _id: admin._id });
    await Coupon.deleteMany({ _id: coupon._id });
    await Product.deleteMany({ _id: product._id });
    console.log("Cleaned up database records.");
    console.log("\n🎉 ALL COUPON USAGE LIMIT TESTS PASSED!");

  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

runTests();
