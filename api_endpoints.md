# RakaRituals API Documentation

This document provide a comprehensive guide for testing all API endpoints.

**Base URL:** `http://localhost:5000`

---

## 🔐 Authentication
**Base Path:** `/api/auth`

### 1. Register User
- **URL:** `/api/auth/register`
- **Method:** `POST`
- **Auth Required:** No
- **Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

### 2. Login User
- **URL:** `/api/auth/login`
- **Method:** `POST`
- **Auth Required:** No
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
*Note: Copy the `token` from the response for subsequent requests.*

> [!IMPORTANT]
> **Test Admin Credentials:**
> - **Email:** `admin@example.com`
> - **Password:** `admin123`
> Use these to login and get an admin token for product management.

---

## 📦 Products
**Base Path:** `/api/products`

### 1. Get All Products
- **URL:** `/api/products?keyword=ritual&pageNumber=1`
- **Method:** `GET`
- **Auth Required:** No

### 2. Get Best Sellers
- **URL:** `/api/products/best`
- **Method:** `GET`
- **Auth Required:** No

### 3. Get Product By ID
- **URL:** `/api/products/:id`
- **Method:** `GET`
- **Auth Required:** No

### 4. Create Product (Admin Only)
- **URL:** `/api/products`
- **Method:** `POST`
- **Auth Required:** Yes (Admin Token)
- **Body:**
```json
{
  "name": "Raka Special Ritual",
  "price": 49.99,
  "description": "Premium ritual experience.",
  "image": "/images/sample.jpg",
  "category": "Rituals",
  "countInStock": 10,
  "isBestSeller": true
}
```

---

## 🛒 Shopping Cart
**Base Path:** `/api/cart`

### 1. Get User Cart
- **URL:** `/api/cart`
- **Method:** `GET`
- **Auth Required:** Yes (Bearer Token)

### 2. Add to Cart
- **URL:** `/api/cart`
- **Method:** `POST`
- **Auth Required:** Yes (Bearer Token)
- **Body:**
```json
{
  "productId": "PRODUCT_ID_HERE",
  "quantity": 2
}
```

### 3. Update Cart Item
- **URL:** `/api/cart/:productId`
- **Method:** `PUT`
- **Auth Required:** Yes (Bearer Token)
- **Body:**
```json
{
  "quantity": 5
}
```

---

## 🧾 Orders
**Base Path:** `/api/orders`

### 1. Place Order
- **URL:** `/api/orders`
- **Method:** `POST`
- **Auth Required:** Yes (Bearer Token)
- **Logics:**
  - Fetches items from user's current cart.
  - Calculates total price server-side for security.
  - Clears the cart upon success.

### 2. Get My Orders
- **URL:** `/api/orders`
- **Method:** `GET`
- **Auth Required:** Yes (Bearer Token)

---

## 🛠️ Testing Instructions

### Using Postman/Insomnia
1. Set the **Authorization** header to `Bearer <YOUR_TOKEN>`.
2. Set **Content-Type** to `application/json`.
3. Use the raw JSON bodies provided above.

### Using VS Code (REST Client Extension)
Create a `.http` file with the following content:
```http
@baseUrl = http://localhost:5000
@token = YOUR_JWT_TOKEN_HERE

### Register
POST {{baseUrl}}/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@test.com",
  "password": "password"
}

### Login
POST {{baseUrl}}/api/auth/login
Content-Type: application/json

{
  "email": "test@test.com",
  "password": "password"
}
```
