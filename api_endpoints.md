# RakaRituals API Endpoints

This document provides a comprehensive list of all API endpoints for testing in Postman.

**Base URL:** `http://localhost:5000`

---

## 🔐 Authentication
**Base Path:** `/api/auth`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user | None |
| `POST` | `/api/auth/login` | Login and get JWT Token | None |

---

## 📦 Products
**Base Path:** `/api/products`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Get all products | None |
| `GET` | `/api/products/best` | Get best-selling products | None |
| `GET` | `/api/products/:id` | Get product by ID | None |
| `POST` | `/api/products` | Create a new product | Admin |
| `PUT` | `/api/products/:id` | Update a product | Admin |
| `DELETE` | `/api/products/:id` | Delete a product | Admin |

---

## 🛒 Shopping Cart
**Base Path:** `/api/cart`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/cart` | Get user's cart | User (Protect) |
| `POST` | `/api/cart` | Add item to cart | User (Protect) |
| `PUT` | `/api/cart/:productId` | Update cart item quantity | User (Protect) |
| `DELETE` | `/api/cart/:productId` | Remove item from cart | User (Protect) |

---

## 🧾 Orders
**Base Path:** `/api/orders`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/orders` | Place a new order | User (Protect) |
| `GET` | `/api/orders` | Get logged-in user's orders | User (Protect) |

---

> [!TIP]
> **Postman Setup:**
> 1. Set the `Authorization` header to `Bearer <YOUR_TOKEN>` for protected routes.
> 2. For `POST` and `PUT` requests, ensure `Content-Type` is set to `application/json` in the headers.
