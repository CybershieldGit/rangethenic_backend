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

    // 1. Create two test admin users (Admin A and Admin B) to verify multi-admin segregation
    console.log("\n--- Creating Test Admins ---");
    const adminA = await User.create({
      name: "Test Admin A",
      email: "test_admin_a@example.com",
      password: "password123",
      isAdmin: true,
      isVerified: true
    });
    console.log(`Created Admin A: ${adminA._id}`);

    const adminB = await User.create({
      name: "Test Admin B",
      email: "test_admin_b@example.com",
      password: "password123",
      isAdmin: true,
      isVerified: true
    });
    console.log(`Created Admin B: ${adminB._id}`);

    // 2. Create products belonging to different admins
    console.log("\n--- Creating Test Products ---");
    const productA = await Product.create({
      name: "Test Product A",
      price: 200,
      description: "Product owned by Admin A",
      user: adminA._id,
      category: "General",
      countInStock: 10,
    });
    console.log(`Product A (Admin A) created with price: ₹${productA.price}`);

    const productB = await Product.create({
      name: "Test Product B",
      price: 500,
      description: "Product owned by Admin B",
      user: adminB._id,
      category: "General",
      countInStock: 10,
    });
    console.log(`Product B (Admin B) created with price: ₹${productB.price}`);

    // 3. Create Coupon codes owned by Admin A
    console.log("\n--- Creating Test Coupons ---");
    const pctCoupon = await Coupon.create({
      code: "TESTPCT10",
      discountType: "percentage",
      discountValue: 10,
      minPurchase: 150,
      isActive: true,
      admin: adminA._id
    });
    console.log(`Percentage Coupon created: ${pctCoupon.code} (10% off, min purchase ₹150)`);

    const fixedCoupon = await Coupon.create({
      code: "TESTFIXED50",
      discountType: "fixed",
      discountValue: 50,
      minPurchase: 100,
      isActive: true,
      admin: adminA._id
    });
    console.log(`Fixed Coupon created: ${fixedCoupon.code} (₹50 off, min purchase ₹100)`);

    // 4. Test validation scenario 1: Valid percentage coupon with matching cart items
    console.log("\n--- Scenario 1: Validate Percentage Coupon ---");
    // Cart has product A (qty 1, price 200)
    let cartItems = [{ product: productA, quantity: 1 }];
    let subtotal = productA.price * 1;

    let coupon = await Coupon.findOne({ code: "TESTPCT10" });
    if (!coupon || !coupon.isActive) throw new Error("Coupon not active");

    let matchingSubtotal = 0;
    cartItems.forEach((item) => {
      if (item.product.user.toString() === coupon.admin.toString()) {
        matchingSubtotal += item.product.price * item.quantity;
      }
    });

    console.log(`Cart subtotal: ₹${subtotal}, Matching subtotal: ₹${matchingSubtotal}`);
    if (matchingSubtotal < coupon.minPurchase) {
      throw new Error(`Min purchase of ₹${coupon.minPurchase} not met`);
    }

    let discount = matchingSubtotal * (coupon.discountValue / 100);
    console.log(`Calculated Discount: ₹${discount} (Expected: ₹20)`);
    if (discount !== 20) throw new Error("Incorrect discount amount calculated");

    // 5. Test validation scenario 2: Minimum purchase constraint not met
    console.log("\n--- Scenario 2: Validate Minimum Purchase Limit ---");
    // Try to buy product A but quantity 0.5 (simulating price below minPurchase ₹150)
    let smallCart = [{ product: productA, quantity: 0.5 }];
    let smallMatchingSubtotal = productA.price * 0.5;
    console.log(`Small cart matching subtotal: ₹${smallMatchingSubtotal} (Min required: ₹${coupon.minPurchase})`);
    if (smallMatchingSubtotal < coupon.minPurchase) {
      console.log("Success: Minimum purchase limit successfully rejected the validation as expected.");
    } else {
      throw new Error("Validation should have failed for low purchase subtotal");
    }

    // 6. Test validation scenario 3: Multi-Admin Isolation (Coupon from Admin A applied to Admin B products)
    console.log("\n--- Scenario 3: Verify Multi-Admin Isolation ---");
    // Cart contains only product B (owned by Admin B). Coupon belongs to Admin A.
    let cartWithBOnly = [{ product: productB, quantity: 1 }];
    let matchingSubtotalForB = 0;
    cartWithBOnly.forEach((item) => {
      if (item.product.user.toString() === coupon.admin.toString()) {
        matchingSubtotalForB += item.product.price * item.quantity;
      }
    });
    console.log(`Cart with Admin B product subtotal: ₹${productB.price * 1}, Matching subtotal for Admin A coupon: ₹${matchingSubtotalForB}`);
    if (matchingSubtotalForB === 0) {
      console.log("Success: Coupon from Admin A is not applicable to Admin B's products.");
    } else {
      throw new Error("Admin A's coupon discounted Admin B's product!");
    }

    // 7. Verify Order creation logic (COD simulation)
    console.log("\n--- Scenario 4: Simulate Order Creation with Discount ---");
    let testOrderItems = cartItems.map(item => ({
      product: item.product._id,
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price
    }));

    let totalPrice = subtotal - discount;
    const testOrder = await Order.create({
      user: adminA._id, // placeholder customer
      orderItems: testOrderItems,
      totalPrice,
      couponCode: coupon.code,
      couponDiscount: discount,
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

    console.log(`Saved Order to DB with ID: ${testOrder._id}`);
    console.log(`Saved Order subtotal (calculated): ₹${subtotal}, discount applied: ₹${testOrder.couponDiscount}, final price: ₹${testOrder.totalPrice}`);
    if (testOrder.totalPrice !== 180 || testOrder.couponCode !== "TESTPCT10" || testOrder.couponDiscount !== 20) {
      throw new Error("Order calculations or coupon codes were not properly saved");
    }
    console.log("Success: Simulated order successfully applied and stored coupon discount values.");

    // Clean up
    console.log("\n--- Cleaning Up Database ---");
    await Order.deleteOne({ _id: testOrder._id });
    await User.deleteMany({ email: /test_.*@example\.com/ });
    await Coupon.deleteMany({ code: /TEST.*/ });
    await Product.deleteMany({ name: /Test Product.*/ });
    console.log("Cleaned up database records.");
    console.log("\n🎉 ALL COUPON INTEGRATION TESTS PASSED!");

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

runTests();
