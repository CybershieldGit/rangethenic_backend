"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProducts, deleteProduct, updateProduct } from "@/utils/api";
import { useSocket } from "@/context/SocketContext";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

const ProductRow = ({ product, onToggleBestseller, onToggleFeatured, isToggling, isTogglingFeatured, onConfirmDelete }) => (
  <tr className="hover:bg-[#fcfbf9]/80 transition-all group border-b border-[#f2eee9]">
    <td className="p-8">
      <div className="flex items-center gap-6">
        <div className="relative group/img flex-shrink-0 w-16 h-16">
          <img 
            src={product.image || "/placeholder-product.jpg"} 
            alt={product.name}
            className="w-16 h-16 min-w-[64px] min-h-[64px] object-cover rounded-[20px] bg-gray-100 shadow-sm transition-all duration-700 group-hover/img:scale-110 group-hover/img:rotate-2 flex-shrink-0"
          />
          <div className="absolute inset-0 bg-[#2b2622]/10 opacity-0 group-hover/img:opacity-100 transition-opacity rounded-[20px]"></div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-[#2b2622] truncate max-w-[240px] tracking-tight text-lg mb-1">{product.name}</span>
          <span className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/40">{product.category || "General Product"}</span>
        </div>
      </div>
    </td>
    <td className="p-8">
      <div className="flex items-baseline gap-1">
        <span className="text-xs font-bold text-[#b89b5e]">₹</span>
        <span className="text-xl font-bold text-[#2b2622] tracking-tighter">{product.price}</span>
      </div>
    </td>
    <td className="p-8">
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-1.5 h-1.5 rounded-full ${product.countInStock > 10 ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/60">
            {product.countInStock > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>
        <span className="text-xl font-bold text-[#2b2622]">{product.countInStock}</span>
      </div>
    </td>
    <td className="p-8">
      <button
        onClick={() => onToggleBestseller(product._id, product.isBestSeller)}
        disabled={isToggling}
        className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border flex items-center gap-2 ${
          product.isBestSeller 
          ? 'bg-[#b89b5e] text-white border-[#b89b5e] hover:bg-transparent hover:text-[#b89b5e] shadow-[0_10px_20px_rgba(184,155,94,0.2)]' 
          : 'bg-transparent text-[#6f6a65]/50 border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e] hover:bg-[#b89b5e]/5'
        }`}
      >
        {isToggling ? <LoadingSpinner color={product.isBestSeller ? "border-white" : "border-[#b89b5e]"} /> : (product.isBestSeller ? 'Most Sellings' : 'Standard')}
      </button>
    </td>
    <td className="p-8">
      <button
        onClick={() => onToggleFeatured(product._id, product.isFeatured)}
        disabled={isTogglingFeatured}
        className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border flex items-center gap-2 ${
          product.isFeatured 
          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-transparent hover:text-emerald-600 shadow-[0_10px_20px_rgba(5,150,105,0.2)]' 
          : 'bg-transparent text-[#6f6a65]/50 border-[#dcd4cb] hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50/5'
        }`}
      >
        {isTogglingFeatured ? <LoadingSpinner color={product.isFeatured ? "border-white" : "border-emerald-600"} /> : (product.isFeatured ? 'New Arrival' : 'Regular')}
      </button>
    </td>
    <td className="p-8">
      <div className="flex items-center gap-8">
        <Link 
          href={`/edit-product/${product._id}`}
          className="text-[#2b2622]/40 hover:text-[#b89b5e] font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 group/edit cursor-pointer"
        >
          <span className="w-0 group-hover/edit:w-2 h-[1px] bg-[#b89b5e] transition-all overflow-hidden"></span>
          Modify
        </Link>
        <button 
          onClick={() => onConfirmDelete(product)}
          className="text-red-300 hover:text-red-500 font-black text-[10px] tracking-widest uppercase transition-all cursor-pointer group/del"
        >
          Delete
          <span className="opacity-0 group-hover/del:opacity-100 transition-opacity ml-2 italic">×</span>
        </button>
      </div>
    </td>
  </tr>
);

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [filterBestseller, setFilterBestseller] = useState(false);
  const [notification, setNotification] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadProducts = async (page = pageNumber, search = debouncedSearch, bestseller = filterBestseller) => {
    try {
      setLoading(true);
      const data = await fetchProducts({
        keyword: search,
        pageNumber: page,
        pageSize: 10,
        isBestseller: bestseller ? "true" : "false"
      });
      setProducts(data.products || []);
      setTotalPages(data.pages || 1);
      setTotalItems(data.total || 0);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProductsSilent = async (page = pageNumber, search = debouncedSearch, bestseller = filterBestseller) => {
    try {
      const data = await fetchProducts({
        keyword: search,
        pageNumber: page,
        pageSize: 10,
        isBestseller: bestseller ? "true" : "false"
      });
      setProducts(data.products || []);
      setTotalPages(data.pages || 1);
      setTotalItems(data.total || 0);
    } catch (err) {
      // ignore
    }
  };

  // Debounce search query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPageNumber(1);
    }, 450);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    loadProducts(pageNumber, debouncedSearch, filterBestseller);
  }, [pageNumber, debouncedSearch, filterBestseller]);

  const socket = useSocket();

  useEffect(() => {
    // Poll every 2 minutes to keep stock counts updated
    const interval = setInterval(() => {
      loadProductsSilent(pageNumber, debouncedSearch, filterBestseller);
    }, 120000);
    return () => clearInterval(interval);
  }, [pageNumber, debouncedSearch, filterBestseller]);

  useEffect(() => {
    if (!socket) return;

    const handleProductCreated = (newProduct) => {
      loadProductsSilent(pageNumber, debouncedSearch, filterBestseller);
      showNotification(`New product ${newProduct.name} created.`);
    };

    const handleProductUpdated = (updatedProduct) => {
      setProducts((prevProducts) => {
        const existingProduct = prevProducts.find((p) => p._id === updatedProduct._id);
        if (existingProduct) {
          const isDifferent = 
            existingProduct.name !== updatedProduct.name ||
            existingProduct.price !== updatedProduct.price ||
            existingProduct.countInStock !== updatedProduct.countInStock ||
            existingProduct.isBestSeller !== updatedProduct.isBestSeller ||
            existingProduct.image !== updatedProduct.image;
          
          if (isDifferent) {
            showNotification(`Product ${updatedProduct.name} updated.`);
          }
        }
        return prevProducts.map((p) => (p._id === updatedProduct._id ? updatedProduct : p));
      });
      loadProductsSilent(pageNumber, debouncedSearch, filterBestseller);
    };

    const handleProductDeleted = (deletedProductId) => {
      setProducts((prevProducts) => {
        const deletedProduct = prevProducts.find((p) => p._id === deletedProductId);
        if (deletedProduct) {
          showNotification(`${deletedProduct.name} has been deleted.`);
        }
        return prevProducts.filter((p) => p._id !== deletedProductId);
      });
      loadProductsSilent(pageNumber, debouncedSearch, filterBestseller);
    };

    socket.on("productCreated", handleProductCreated);
    socket.on("productUpdated", handleProductUpdated);
    socket.on("productDeleted", handleProductDeleted);

    return () => {
      socket.off("productCreated", handleProductCreated);
      socket.off("productUpdated", handleProductUpdated);
      socket.off("productDeleted", handleProductDeleted);
    };
  }, [socket, pageNumber, debouncedSearch, filterBestseller]);

  const handleDeleteProduct = async (id) => {
    try {
      await deleteProduct(id);
      showNotification("Product deleted successfully.");
      setProductToDelete(null);
      loadProducts(pageNumber, debouncedSearch, filterBestseller);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const handleToggleBestseller = async (id, currentStatus) => {
    setTogglingId(id);
    try {
      const newStatus = !currentStatus;
      await updateProduct(id, { isBestSeller: newStatus });
      setProducts(products.map(p => p._id === id ? { ...p, isBestSeller: newStatus } : p));
      showNotification(newStatus ? "Product set as Bestseller." : "Bestseller status removed.");
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleFeatured = async (id, currentStatus) => {
    setTogglingFeaturedId(id);
    try {
      const newStatus = !currentStatus;
      await updateProduct(id, { isFeatured: newStatus });
      setProducts(products.map(p => p._id === id ? { ...p, isFeatured: newStatus } : p));
      showNotification(newStatus ? "Product set as New Arrival." : "New Arrival status removed.");
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  const filteredProducts = products;

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Premium Toast Notification */}
      {notification && (
        <div className={`fixed bottom-12 right-12 z-[100] px-8 py-5 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all animate-in slide-in-from-right duration-500 flex items-center gap-4 ${
          notification.type === "success" ? "bg-[#2b2622] text-white border-l-4 border-[#b89b5e]" : "bg-red-600 text-white"
        }`}>
          <div className="w-2 h-2 bg-[#b89b5e] rounded-full animate-pulse"></div>
          <p className="text-xs font-bold uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 md:gap-10 mb-12 md:mb-20 px-4 sm:px-0">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-4">— Inventory —</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-3 md:mb-4">Product Catalog</h1>
          <p className="text-[#6f6a65] text-xs md:text-sm max-w-lg leading-relaxed opacity-60 italic">Manage your product catalog. Every change here is reflected across the entire store.</p>
        </div>
        <Link 
          href="/create-product"
          className="bg-[#2b2622] text-white w-full xl:w-auto text-center px-6 py-4 md:px-10 md:py-5 rounded-[20px] md:rounded-[28px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-[#b89b5e] transition-all shadow-[0_20px_40px_rgba(43,38,34,0.15)] hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(184,155,94,0.25)] active:scale-95 group"
        >
          <span className="flex items-center justify-center xl:justify-start gap-3">
            Add New Product <span className="text-lg md:text-xl group-hover:rotate-90 transition-transform inline-block">+</span>
          </span>
        </Link>
      </div>

      {/* Modern Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 mb-8 md:mb-10 px-4 sm:px-0">
        <div className="md:col-span-7 relative group">
          <input 
            type="text" 
            placeholder="Search product by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#dcd4cb] rounded-[16px] md:rounded-[24px] px-5 py-4 md:px-8 md:py-5 text-xs md:text-sm font-bold outline-none focus:border-[#b89b5e] focus:shadow-[0_10px_30px_rgba(184,155,94,0.05)] transition-all group-hover:border-[#b89b5e]/40"
          />
          <span className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 opacity-20 text-xs md:text-sm group-hover:opacity-40 transition-opacity italic flex items-center gap-2">
            {loading && <LoadingSpinner size="w-3.5 h-3.5" color="border-[#b89b5e]" />}
            {loading ? "Searching..." : "Searching"}
          </span>
        </div>
        <div className="md:col-span-3">
          <button 
            onClick={() => setFilterBestseller(!filterBestseller)}
            className={`w-full h-full px-5 py-4 md:px-8 md:py-5 rounded-[16px] md:rounded-[24px] text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all ${
              filterBestseller 
              ? 'bg-[#b89b5e] text-white border-[#b89b5e] shadow-[0_10px_30px_rgba(184,155,94,0.1)]' 
              : 'bg-white text-[#6f6a65]/60 border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e]'
            }`}
          >
            {filterBestseller ? 'Bestsellers Only' : 'Show All Products'}
          </button>
        </div>
        <div className="md:col-span-2 bg-[#e2ddd5] rounded-[16px] md:rounded-[24px] px-4 py-4 md:px-6 md:py-5 flex items-center justify-center border border-[#dcd4cb]">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#2b2622]/40">
            {totalItems} Items
          </span>
        </div>
      </div>

      {/* Refined Products Table */}
      <div className="bg-white rounded-[48px] border border-[#dcd4cb] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.03)] mx-4 sm:mx-0 mb-10">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-[#fcfbf9]">
              <tr className="border-b border-[#f2eee9]">
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Product Details</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Price</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Stock</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Bestseller</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">New Arrivals</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#fcfbf9]">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
                      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#b89b5e] animate-pulse">Illuminating Catalog...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-32 text-center flex-col items-center">
                    <div className="text-8xl mb-8 opacity-10">🔍</div>
                    <p className="text-[#6f6a65] font-bold text-xl tracking-tighter italic">No products found.</p>
                    <p className="text-[#6f6a65]/40 text-xs mt-2 uppercase tracking-widest">Adjust your search criteria or add a new product.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <ProductRow 
                    key={product._id} 
                    product={product} 
                    onToggleBestseller={handleToggleBestseller}
                    onToggleFeatured={handleToggleFeatured}
                    isToggling={togglingId === product._id}
                    isTogglingFeatured={togglingFeaturedId === product._id}
                    onConfirmDelete={(product) => setProductToDelete(product)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-10 py-6 bg-[#fcfbf9] border-t border-[#f2eee9] rounded-b-[48px]">
            <button
              onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
              disabled={pageNumber === 1}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white border border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e] text-xs font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#dcd4cb] disabled:hover:text-inherit"
            >
              ← Previous
            </button>
            
            <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPageNumber(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                    pageNumber === p
                    ? "bg-[#2b2622] text-white shadow-md"
                    : "bg-white border border-[#dcd4cb] hover:border-[#b89b5e] text-[#2b2622]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPageNumber(prev => Math.min(prev + 1, totalPages))}
              disabled={pageNumber === totalPages}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white border border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e] text-xs font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#dcd4cb] disabled:hover:text-inherit"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-[#2b2622]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-[#fdfaf5] w-full max-w-md rounded-[24px] border border-[#e8e4de] p-6 shadow-[0_16px_40px_rgba(43,38,34,0.12)] relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            <button
              onClick={() => setProductToDelete(null)}
              className="absolute top-6 right-6 text-[#6f6a65]/40 hover:text-[#2b2622] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex flex-col items-start mt-4 space-y-4">
              <div>
                <span className="text-red-500 font-black tracking-[0.25em] uppercase text-[8.5px] block mb-1.5">
                  Danger Zone
                </span>
                <h3 className="text-xl font-serif text-[#2b2622]">Delete this product?</h3>
                <p className="text-[11px] text-[#6f6a65] font-light mt-1.5 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-[#2b2622]">"{productToDelete.name}"</span>? This action will permanently remove the product from the inventory and cannot be undone.
                </p>
              </div>
              
              <div className="flex gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(productToDelete._id)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center active:scale-95"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="px-6 py-3.5 rounded-xl border border-[#e8e4de] text-[#6f6a65] text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
