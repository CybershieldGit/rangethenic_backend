import { getToken } from "./auth";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005";

// Helper for headers
const getHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Global Fetch Wrapper with Logging and Error Handling
const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}${endpoint}`;
  console.log("REQUEST:", url, options.method || "GET");
  
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
    });

    const data = await res.json();
    console.log("RESPONSE:", url, data);

    if (!res.ok) {
      const errorMsg = data.message || "API request failed";
      
      // Categorize console output: 4xx Client Validation vs 5xx Server Errors
      if (res.status >= 400 && res.status < 500) {
        console.warn(`API Client Validation (${res.status} at ${url}):`, errorMsg);
      } else {
        console.error(`API Server Error (${res.status} at ${url}):`, errorMsg);
      }

      // Automatically log out if the token is invalid or expired
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          
          // Just reload the page silently to convert them to a guest, 
          // don't force a redirect to login
          window.location.reload();
        }
      }

      const apiError = new Error(errorMsg);
      apiError.status = res.status;
      throw apiError;
    }

    return data;
  } catch (error) {
    // Only log standard network connection/browser failures as severe error
    if (!error.status) {
      console.error(`Network / Connection Error (${url}):`, error.message || error);
    }
    throw error;
  }
};

export const fetchProducts = async () => {
  return apiFetch("/api/products");
};

export const searchProducts = async (keyword = "") => {
  const params = new URLSearchParams();
  if (keyword) params.append("keyword", keyword);
  return apiFetch(`/api/products?${params.toString()}`);
};

export const fetchBestSellers = async () => {
  return apiFetch("/api/products/best");
};

export const fetchFeaturedProduct = async () => {
  return apiFetch("/api/products/featured");
};

export const fetchProductsByCategory = async (category, pageNumber = 1) => {
  const params = new URLSearchParams();
  params.append("category", category);
  params.append("pageNumber", pageNumber);
  return apiFetch(`/api/products?${params.toString()}`);
};

// --- AUTH API ---

export const loginUser = async (email, password) => {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
  }
  return data;
};

export const registerUser = async (name, email, password) => {
  const data = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data));
  }
  return data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const getUserProfile = async () => {
  return apiFetch("/api/users/profile");
};

export const updateUserProfile = async (profileData) => {
  return apiFetch("/api/users/profile", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });
};

// --- CART API ---

export const getCart = async () => {
  return apiFetch("/api/cart");
};

export const addToCart = async (productId, quantity = 1) => {
  return apiFetch("/api/cart", {
    method: "POST",
    body: JSON.stringify({ productId, quantity }),
  });
};

export const updateCartItem = async (productId, quantity) => {
  return apiFetch(`/api/cart/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ quantity }),
  });
};

export const removeFromCart = async (productId) => {
  return apiFetch(`/api/cart/${productId}`, {
    method: "DELETE",
  });
};

// --- ORDERS API ---

export const placeOrder = async (orderData) => {
  return apiFetch("/api/orders", {
    method: "POST",
    body: JSON.stringify(orderData),
  });
};

export const verifyPayment = async (orderId, paymentData) => {
  return apiFetch(`/api/orders/${orderId}/pay`, {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
};

export const getMyOrders = async () => {
  return apiFetch("/api/orders/myorders");
};

export const getAllOrders = async () => {
  return apiFetch("/api/orders");
};

export const updateOrderDeliveryStatus = async (orderId, deliveryStatus) => {
  return apiFetch(`/api/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ deliveryStatus }),
  });
};

export const updateOrderPaymentStatus = async (orderId, isPaid) => {
  return apiFetch(`/api/orders/${orderId}/status`, {
    method: "PUT",
    body: JSON.stringify({ isPaid }),
  });
};

export const cancelOrderAPI = async (orderId, cancelData) => {
  return apiFetch(`/api/orders/${orderId}/cancel`, {
    method: "PUT",
    body: JSON.stringify(cancelData),
  });
};

// --- SHIPPING / SHIPROCKET API ---

export const getShippingConfig = async () => {
  return apiFetch("/api/shipping/config");
};

export const getShippingRates = async (postalCode, paymentMethod = "Online", buyNow = null) => {
  return apiFetch("/api/shipping/rates", {
    method: "POST",
    body: JSON.stringify({
      postalCode,
      paymentMethod,
      ...(buyNow ? { buyNow } : {}),
    }),
  });
};

export const syncOrderToShiprocket = async (orderId) => {
  return apiFetch(`/api/shipping/orders/${orderId}/sync`, {
    method: "POST",
  });
};

export const cancelShiprocketOrder = async (orderId) => {
  return apiFetch(`/api/shipping/orders/${orderId}/cancel`, {
    method: "POST",
  });
};

export const createShipment = async (orderId) => {
  return apiFetch(`/api/shipping/orders/${orderId}/ship`, {
    method: "POST",
  });
};

export const getOrderTracking = async (orderId) => {
  return apiFetch(`/api/shipping/orders/${orderId}/track`);
};

export const publicTrackShipment = async ({ orderId, awb } = {}) => {
  const params = new URLSearchParams();
  if (awb?.trim()) params.set("awb", awb.trim());
  else if (orderId?.trim()) {
    params.set("order_id", orderId.trim());
  }
  return apiFetch(`/api/shipping/track-public?${params.toString()}`);
};

export const generateAWB = async (orderId) => {
  return apiFetch(`/api/shipping/orders/${orderId}/generate-awb`, {
    method: "POST",
  });
};

export const trackShipment = async (shipmentId) => {
  return apiFetch(`/api/shipping/track/${shipmentId}`);
};

export const downloadOrderInvoice = async (orderId) => {
  return apiFetch(`/api/shipping/orders/${orderId}/invoice`);
};

export const downloadOrderManifest = async (orderId) => {
  return apiFetch(`/api/shipping/orders/${orderId}/manifest`);
};

// --- ADMIN PRODUCTS API ---

export const createProduct = async (productData) => {
  return apiFetch("/api/products", {
    method: "POST",
    body: JSON.stringify(productData),
  });
};

export const updateProduct = async (id, productData) => {
  return apiFetch(`/api/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(productData),
  });
};

export const deleteProduct = async (id) => {
  return apiFetch(`/api/products/${id}`, {
    method: "DELETE",
  });
};

export const fetchProductById = async (id) => {
  return apiFetch(`/api/products/${id}`);
};

export const uploadImage = async (fileFormData) => {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: fileFormData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to upload image");
  }
  return data;
};

export const uploadVideo = async (fileFormData) => {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/upload/video`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: fileFormData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Failed to upload video");
  }
  return data;
};

// --- CATEGORIES API ---

// Distinct categories aggregated from products (name, count, image) — used for storefront-style views
export const fetchProductCategories = async () => {
  return apiFetch("/api/products/categories");
};

// Full category documents from the Category collection (includes subcategories)
export const fetchCategories = async () => {
  return apiFetch("/api/categories");
};

export const createCategory = async (name, subcategories = []) => {
  return apiFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name, subcategories }),
  });
};

export const deleteCategory = async (id) => {
  return apiFetch(`/api/categories/${id}`, {
    method: "DELETE",
  });
};

export const addSubcategory = async (categoryId, name) => {
  return apiFetch(`/api/categories/${categoryId}/subcategories`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
};

export const deleteSubcategory = async (categoryId, name) => {
  return apiFetch(`/api/categories/${categoryId}/subcategories`, {
    method: "DELETE",
    body: JSON.stringify({ name }),
  });
};

// --- COUPONS API ---

export const fetchActiveCoupons = async () => {
  return apiFetch("/api/coupons");
};

export const fetchCouponsAdmin = async () => {
  return apiFetch("/api/coupons/admin");
};

export const createCouponAPI = async (couponData) => {
  return apiFetch("/api/coupons", {
    method: "POST",
    body: JSON.stringify(couponData),
  });
};

export const updateCouponAPI = async (id, couponData) => {
  return apiFetch(`/api/coupons/${id}`, {
    method: "PUT",
    body: JSON.stringify(couponData),
  });
};

export const deleteCouponAPI = async (id) => {
  return apiFetch(`/api/coupons/${id}`, {
    method: "DELETE",
  });
};

export const validateCouponAPI = async (code, itemsPrice) => {
  return apiFetch("/api/coupons/validate", {
    method: "POST",
    body: JSON.stringify({ code, itemsPrice }),
  });
};

// --- WISHLIST API ---

export const getWishlist = async () => {
  return apiFetch("/api/users/wishlist");
};

export const addToWishlist = async (productId) => {
  return apiFetch("/api/users/wishlist", {
    method: "POST",
    body: JSON.stringify({ productId }),
  });
};

export const removeFromWishlist = async (productId) => {
  return apiFetch(`/api/users/wishlist/${productId}`, {
    method: "DELETE",
  });
};

export const createProductReview = async (productId, reviewData) => {
  return apiFetch(`/api/products/${productId}/reviews`, {
    method: "POST",
    body: JSON.stringify(reviewData),
  });
};

// --- ATTRIBUTES API ---

export const fetchAttributes = async (type = "") => {
  const params = new URLSearchParams();
  if (type) params.append("type", type);
  return apiFetch(`/api/attributes?${params.toString()}`);
};

export const createAttributeAPI = async (type, value) => {
  return apiFetch("/api/attributes", {
    method: "POST",
    body: JSON.stringify({ type, value }),
  });
};

export const deleteAttributeAPI = async (id) => {
  return apiFetch(`/api/attributes/${id}`, {
    method: "DELETE",
  });
};

