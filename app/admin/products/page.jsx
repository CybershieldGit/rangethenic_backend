"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchProducts, deleteProduct, updateProduct } from "@/utils/api";
import { useSocket } from "@/context/SocketContext";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

const ProductRow = ({ product, onDelete, onToggleBestseller, onToggleFeatured, isToggling, isTogglingFeatured, confirmDeleteId, onConfirmDelete, onCancelDelete }) => (
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
          <span className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/40">{product.category || "General Ritual"}</span>
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
            {product.countInStock > 0 ? 'Sacred Reserves' : 'None Remaining'}
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
          href={`/admin/edit-product/${product._id}`}
          className="text-[#2b2622]/40 hover:text-[#b89b5e] font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 group/edit cursor-pointer"
        >
          <span className="w-0 group-hover/edit:w-2 h-[1px] bg-[#b89b5e] transition-all overflow-hidden"></span>
          Modify
        </Link>
        {confirmDeleteId === product._id ? (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onDelete(product._id, product.name)}
              className="bg-red-500 text-white px-3 py-1.5 rounded-lg font-black text-[9px] tracking-widest uppercase hover:bg-red-600 transition-all cursor-pointer"
            >
              Yes, Expel
            </button>
            <button 
              onClick={() => onCancelDelete()}
              className="text-[#6f6a65] font-black text-[9px] tracking-widest uppercase hover:text-[#2b2622] transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button 
            onClick={() => onConfirmDelete(product._id)}
            className="text-red-300 hover:text-red-500 font-black text-[10px] tracking-widest uppercase transition-all cursor-pointer group/del"
          >
            Expel
            <span className="opacity-0 group-hover/del:opacity-100 transition-opacity ml-2 italic">×</span>
          </button>
        )}
      </div>
    </td>
  </tr>
);

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBestseller, setFilterBestseller] = useState(false);
  const [notification, setNotification] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data.products || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Silent background refresh — no loading spinner
  const refreshProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data.products || []);
    } catch (err) {
      // Silently fail on background refresh
    }
  };

  const socket = useSocket();

  useEffect(() => {
    loadProducts();

    // Poll every 2 minutes to keep stock counts updated
    const interval = setInterval(refreshProducts, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleProductCreated = (newProduct) => {
      setProducts((prevProducts) => {
        if (prevProducts.some((p) => p._id === newProduct._id)) return prevProducts;
        return [newProduct, ...prevProducts];
      });
      showNotification(`New manifestation ${newProduct.name} materialized.`);
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
            showNotification(`Manifestation ${updatedProduct.name} updated.`);
          }
        }
        return prevProducts.map((p) => (p._id === updatedProduct._id ? updatedProduct : p));
      });
    };

    const handleProductDeleted = (deletedProductId) => {
      setProducts((prevProducts) => {
        const deletedProduct = prevProducts.find((p) => p._id === deletedProductId);
        if (deletedProduct) {
          showNotification(`${deletedProduct.name} has been removed from sacred stock.`);
        }
        return prevProducts.filter((p) => p._id !== deletedProductId);
      });
    };

    socket.on("productCreated", handleProductCreated);
    socket.on("productUpdated", handleProductUpdated);
    socket.on("productDeleted", handleProductDeleted);

    return () => {
      socket.off("productCreated", handleProductCreated);
      socket.off("productUpdated", handleProductUpdated);
      socket.off("productDeleted", handleProductDeleted);
    };
  }, [socket]);

  const handleDelete = async (id, name) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter((p) => p._id !== id));
      setConfirmDeleteId(null);
      showNotification(`${name} has been removed from sacred stock.`);
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const handleToggleBestseller = async (id, currentStatus) => {
    setTogglingId(id);
    try {
      await updateProduct(id, { isBestSeller: !currentStatus });
      setProducts(products.map(p => p._id === id ? { ...p, isBestSeller: !currentStatus } : p));
      showNotification("Manifestation status updated.");
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
      // Backend enforces single-featured, so reflect that locally
      if (newStatus) {
        setProducts(products.map(p => p._id === id ? { ...p, isFeatured: true } : { ...p, isFeatured: false }));
      } else {
        setProducts(products.map(p => p._id === id ? { ...p, isFeatured: false } : p));
      }
      showNotification(newStatus ? "Product set as New Arrival." : "New Arrival status removed.");
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterBestseller ? p.isBestSeller : true;
      return matchesSearch && matchesFilter;
    });
  }, [products, searchQuery, filterBestseller]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
        <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#b89b5e] animate-pulse">Illuminating Catalog...</p>
      </div>
    );
  }

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
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-4">— Inventory Chamber —</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-3 md:mb-4">Temple Catalog</h1>
          <p className="text-[#6f6a65] text-xs md:text-sm max-w-lg leading-relaxed opacity-60 italic">Refine your divine offerings. Every change here manifests across the entire ritual experience.</p>
        </div>
        <Link 
          href="/admin/create-product"
          className="bg-[#2b2622] text-white w-full xl:w-auto text-center px-6 py-4 md:px-10 md:py-5 rounded-[20px] md:rounded-[28px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-[#b89b5e] transition-all shadow-[0_20px_40px_rgba(43,38,34,0.15)] hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(184,155,94,0.25)] active:scale-95 group"
        >
          <span className="flex items-center justify-center xl:justify-start gap-3">
            Add New Ritual <span className="text-lg md:text-xl group-hover:rotate-90 transition-transform inline-block">+</span>
          </span>
        </Link>
      </div>

      {/* Modern Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 mb-8 md:mb-10 px-4 sm:px-0">
        <div className="md:col-span-7 relative group">
          <input 
            type="text" 
            placeholder="Seek ritual by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#dcd4cb] rounded-[16px] md:rounded-[24px] px-5 py-4 md:px-8 md:py-5 text-xs md:text-sm font-bold outline-none focus:border-[#b89b5e] focus:shadow-[0_10px_30px_rgba(184,155,94,0.05)] transition-all group-hover:border-[#b89b5e]/40"
          />
          <span className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 opacity-20 text-lg md:text-xl group-hover:opacity-40 transition-opacity italic">Seeking</span>
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
            {filterBestseller ? 'Illuminated Path Only' : 'Show All Rituals'}
          </button>
        </div>
        <div className="md:col-span-2 bg-[#e2ddd5] rounded-[16px] md:rounded-[24px] px-4 py-4 md:px-6 md:py-5 flex items-center justify-center border border-[#dcd4cb]">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#2b2622]/40">
            {filteredProducts.length} Sacred Items
          </span>
        </div>
      </div>

      {/* Refined Products Table */}
      <div className="bg-white rounded-[48px] border border-[#dcd4cb] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.03)] mx-4 sm:mx-0 mb-10">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#fcfbf9] border-b border-[#f2eee9]">
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Ritual Manifestation</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Value</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Reserve</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Stature</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">New Arrivals</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#fcfbf9]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-32 text-center flex-col items-center">
                    <div className="text-8xl mb-8 opacity-10">🕯️</div>
                    <p className="text-[#6f6a65] font-bold text-xl tracking-tighter italic">The archives are echoingly silent.</p>
                    <p className="text-[#6f6a65]/40 text-xs mt-2 uppercase tracking-widest">Adjust your seeking criteria or add a new manifestation.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <ProductRow 
                    key={product._id} 
                    product={product} 
                    onDelete={handleDelete}
                    onToggleBestseller={handleToggleBestseller}
                    onToggleFeatured={handleToggleFeatured}
                    isToggling={togglingId === product._id}
                    isTogglingFeatured={togglingFeaturedId === product._id}
                    confirmDeleteId={confirmDeleteId}
                    onConfirmDelete={(id) => setConfirmDeleteId(id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
