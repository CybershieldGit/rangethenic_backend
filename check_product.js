import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';
import Order from './models/Order.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB cluster.");

    const Order = mongoose.model('Order');
    const orders = await Order.find({}).populate('orderItems.product');
    console.log("All Orders in Database:");
    orders.forEach(o => {
      console.log(`- ID: ${o._id}, CreatedAt: ${o.createdAt}, Method: ${o.paymentMethod}, Paid: ${o.isPaid}, Status: ${o.deliveryStatus}, Items:`);
      o.orderItems.forEach(item => {
        console.log(`  * Product: ${item.product ? item.product.name : 'Unknown'} (ID: ${item.product ? item.product._id : 'N/A'}), Qty: ${item.quantity}, Price: ${item.price}`);
      });
    });

    const products = await Product.find({});
    console.log("\nAll Products in Database:");
    products.forEach(p => {
      console.log(`- ID: ${p._id}, Name: ${p.name}, Stock: ${p.countInStock}, Owner Admin: ${p.user}`);
    });
  } catch (err) {
    console.error("Error during query:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
};

run();
