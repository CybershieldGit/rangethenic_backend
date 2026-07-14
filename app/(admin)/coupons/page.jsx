"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { 
  fetchCouponsAdmin, 
  createCouponAPI, 
  updateCouponAPI, 
  deleteCouponAPI,
  fetchProducts
} from "@/utils/api";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

const CouponRow = ({ 
  coupon, 
  onDelete, 
  onToggleActive, 
  isToggling, 
  confirmDeleteId, 
  onConfirmDelete, 
  onCancelDelete,
  onEdit
}) => {
  const isExpired = coupon.expiryDate ? new Date(coupon.expiryDate) < new Date() : false;
  
  return (
    <tr className="hover:bg-[#fcfbf9]/80 transition-all group border-b border-[#f2eee9]">
      <td className="p-8">
        <div className="flex flex-col">
          <span className="font-mono font-bold text-[#2b2622] tracking-wider text-lg mb-1">
            {coupon.code}
          </span>
          <span className="text-[10px] uppercase font-black tracking-widest text-[#b89b5e]">
            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} OFF`}
          </span>
        </div>
      </td>
      <td className="p-8">
        <div className="flex flex-col max-w-[300px]">
          <span className="text-sm font-medium text-[#2b2622] leading-relaxed italic">
            "{coupon.description}"
          </span>
          {coupon.minPurchase > 0 && (
            <span className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/40 mt-1">
              Min Purchase: ₹{coupon.minPurchase}
            </span>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {coupon.firstOrderOnly && (
              <span className="text-[8px] uppercase font-black tracking-widest text-[#b89b5e] bg-[#b89b5e]/10 px-2 py-0.5 rounded-full">
                First Order Only
              </span>
            )}
            {coupon.usageLimit && (
              <span className="text-[8px] uppercase font-black tracking-widest text-[#6f6a65]/60 bg-[#f2eee9] px-2 py-0.5 rounded-full">
                Used {coupon.usedCount || 0}/{coupon.usageLimit}
              </span>
            )}
            {coupon.applicableProducts && coupon.applicableProducts.length > 0 && (
              <span className="text-[8px] uppercase font-black tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {coupon.applicableProducts.length} Specific Products
              </span>
            )}
            {coupon.excludedProducts && coupon.excludedProducts.length > 0 && (
              <span className="text-[8px] uppercase font-black tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {coupon.excludedProducts.length} Excluded Products
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="p-8">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[#2b2622]">
            {coupon.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "Eternal (No Expiry)"}
          </span>
          {isExpired && (
            <span className="text-[9px] text-red-500 font-bold uppercase tracking-widest mt-0.5">Expired</span>
          )}
        </div>
      </td>
      <td className="p-8">
        <button
          onClick={() => onToggleActive(coupon._id, coupon.isActive)}
          disabled={isToggling || isExpired}
          className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border flex items-center gap-2 ${
            isExpired
              ? 'bg-transparent text-gray-300 border-gray-200 cursor-not-allowed'
              : coupon.isActive 
              ? 'bg-green-600 text-white border-green-600 hover:bg-transparent hover:text-green-600 shadow-[0_10px_20px_rgba(22,163,74,0.15)]' 
              : 'bg-transparent text-[#6f6a65]/50 border-[#dcd4cb] hover:border-green-600 hover:text-green-600 hover:bg-green-50/5'
          }`}
        >
          {isToggling ? (
            <LoadingSpinner color={coupon.isActive ? "border-white" : "border-green-600"} />
          ) : (
            coupon.isActive ? 'Active' : 'Inactive'
          )}
        </button>
      </td>
      <td className="p-8">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => onEdit(coupon)}
            className="text-[#2b2622]/40 hover:text-[#b89b5e] font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 group/edit cursor-pointer"
          >
            <span className="w-0 group-hover/edit:w-2 h-[1px] bg-[#b89b5e] transition-all overflow-hidden"></span>
            Modify
          </button>
          {confirmDeleteId === coupon._id ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onDelete(coupon._id, coupon.code)}
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
              onClick={() => onConfirmDelete(coupon._id)}
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
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterActive, setFilterActive] = useState("all"); // "all", "active", "inactive", "expired"
  const [notification, setNotification] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  // Dropdown states for restrictions
  const [appProductsDropdownOpen, setAppProductsDropdownOpen] = useState(false);
  const [exProductsDropdownOpen, setExProductsDropdownOpen] = useState(false);
  const appProductsRef = useRef(null);
  const exProductsRef = useRef(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null); // null means creating new
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage",
    discountValue: 0,
    minPurchase: 0,
    description: "",
    expiryDate: "",
    isActive: true,
    firstOrderOnly: false,
    usageLimit: "",
    applicableProducts: [],
    excludedProducts: [],
  });

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const [couponsData, productsData] = await Promise.all([
        fetchCouponsAdmin(),
        fetchProducts()
      ]);
      setCoupons(couponsData || []);
      setProducts(productsData?.products || productsData || []);
    } catch (err) {
      console.error(err);
      showNotification(err.message || "Failed to load coupons", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (appProductsRef.current && !appProductsRef.current.contains(e.target)) {
        setAppProductsDropdownOpen(false);
      }
      if (exProductsRef.current && !exProductsRef.current.contains(e.target)) {
        setExProductsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async (id, code) => {
    try {
      await deleteCouponAPI(id);
      setCoupons(coupons.filter((c) => c._id !== id));
      setConfirmDeleteId(null);
      showNotification(`Coupon ${code} has been expelled from the database.`);
    } catch (err) {
      showNotification(err.message || "Failed to delete coupon", "error");
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    setTogglingId(id);
    try {
      const updated = await updateCouponAPI(id, { isActive: !currentStatus });
      setCoupons(coupons.map(c => c._id === id ? updated : c));
      showNotification(`Coupon status updated successfully.`);
    } catch (err) {
      showNotification(err.message || "Failed to update status", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: 0,
      minPurchase: 0,
      description: "",
      expiryDate: "",
      isActive: true,
      firstOrderOnly: false,
      usageLimit: "",
      applicableProducts: [],
      excludedProducts: [],
    });
    setFormError("");
    setAppProductsDropdownOpen(false);
    setExProductsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minPurchase: coupon.minPurchase || 0,
      description: coupon.description,
      expiryDate: coupon.expiryDate ? coupon.expiryDate.split('T')[0] : "",
      isActive: coupon.isActive,
      firstOrderOnly: Boolean(coupon.firstOrderOnly),
      usageLimit: coupon.usageLimit || "",
      applicableProducts: coupon.applicableProducts || [],
      excludedProducts: coupon.excludedProducts || [],
    });
    setFormError("");
    setAppProductsDropdownOpen(false);
    setExProductsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      if (!formData.code.trim()) throw new Error("Coupon code is required");
      if (!formData.description.trim()) throw new Error("Description is required");
      if (formData.discountValue < 0) throw new Error("Discount value cannot be negative");

      const submitData = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        expiryDate: formData.expiryDate || null,
        firstOrderOnly: Boolean(formData.firstOrderOnly),
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      };

      if (editingCoupon) {
        const updated = await updateCouponAPI(editingCoupon._id, submitData);
        setCoupons(coupons.map(c => c._id === editingCoupon._id ? updated : c));
        showNotification(`Coupon ${submitData.code} updated successfully.`);
      } else {
        const created = await createCouponAPI(submitData);
        setCoupons([created, ...coupons]);
        showNotification(`Coupon ${submitData.code} created successfully.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter(c => {
      const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            c.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const isExpired = c.expiryDate ? new Date(c.expiryDate) < new Date() : false;
      
      if (filterActive === "active") {
        return matchesSearch && c.isActive && !isExpired;
      } else if (filterActive === "inactive") {
        return matchesSearch && !c.isActive;
      } else if (filterActive === "expired") {
        return matchesSearch && isExpired;
      }
      
      return matchesSearch;
    });
  }, [coupons, searchQuery, filterActive]);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
        <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#b89b5e] animate-pulse">Illuminating Chamber...</p>
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
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-4">— Promo Chamber —</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-3 md:mb-4">Temple Coupons</h1>
          <p className="text-[#6f6a65] text-xs md:text-sm max-w-lg leading-relaxed opacity-60 italic">Refine your sacred offerings and active deals. All active codes scroll majestically across the Temple announcement bar.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="bg-[#2b2622] text-white w-full xl:w-auto text-center px-6 py-4 md:px-10 md:py-5 rounded-[20px] md:rounded-[28px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-[#b89b5e] transition-all shadow-[0_20px_40px_rgba(43,38,34,0.15)] hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(184,155,94,0.25)] active:scale-95 group cursor-pointer"
        >
          <span className="flex items-center justify-center xl:justify-start gap-3">
            Add New Coupon <span className="text-lg md:text-xl group-hover:rotate-90 transition-transform inline-block">+</span>
          </span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 mb-8 md:mb-10 px-4 sm:px-0">
        <div className="md:col-span-6 relative group">
          <input 
            type="text" 
            placeholder="Seek coupon by code or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#dcd4cb] rounded-[16px] md:rounded-[24px] px-5 py-4 md:px-8 md:py-5 text-xs md:text-sm font-bold outline-none focus:border-[#b89b5e] focus:shadow-[0_10px_30px_rgba(184,155,94,0.05)] transition-all group-hover:border-[#b89b5e]/40"
          />
          <span className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 opacity-20 text-lg md:text-xl group-hover:opacity-40 transition-opacity italic">Seeking</span>
        </div>
        <div className="md:col-span-4 grid grid-cols-3 gap-2">
          {[
            { label: "All", val: "all" },
            { label: "Active", val: "active" },
            { label: "Expired", val: "expired" }
          ].map(opt => (
            <button 
              key={opt.val}
              onClick={() => setFilterActive(opt.val)}
              className={`px-3 py-4 rounded-[16px] md:rounded-[20px] text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                filterActive === opt.val 
                ? 'bg-[#b89b5e] text-white border-[#b89b5e] shadow-[0_10px_30px_rgba(184,155,94,0.1)]' 
                : 'bg-white text-[#6f6a65]/60 border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="md:col-span-2 bg-[#e2ddd5] rounded-[16px] md:rounded-[24px] px-4 py-4 md:px-6 md:py-5 flex items-center justify-center border border-[#dcd4cb]">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#2b2622]/40 text-center">
            {filteredCoupons.length} Coupons
          </span>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-[48px] border border-[#dcd4cb] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.03)] mx-4 sm:mx-0 mb-10">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#fcfbf9] border-b border-[#f2eee9]">
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Coupon Info</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Marquee Text</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Expiry</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">State</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#fcfbf9]">
              {filteredCoupons.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-32 text-center flex-col items-center">
                    <div className="text-8xl mb-8 opacity-10">🎟️</div>
                    <p className="text-[#6f6a65] font-bold text-xl tracking-tighter italic">No coupons inhabit these halls.</p>
                    <p className="text-[#6f6a65]/40 text-xs mt-2 uppercase tracking-widest">Adjust your seeking criteria or add a new coupon code.</p>
                  </td>
                </tr>
              ) : (
                filteredCoupons.map((coupon) => (
                  <CouponRow 
                    key={coupon._id} 
                    coupon={coupon} 
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    isToggling={togglingId === coupon._id}
                    confirmDeleteId={confirmDeleteId}
                    onConfirmDelete={(id) => setConfirmDeleteId(id)}
                    onCancelDelete={() => setConfirmDeleteId(null)}
                    onEdit={openEditModal}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation/Edit Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2b2622]/40 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg border border-[#dcd4cb] p-8 md:p-10 shadow-2xl animate-in fade-in duration-300 max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold tracking-tighter text-[#2b2622]">
                {editingCoupon ? "Modify Coupon" : "Manifest New Coupon"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-[#6f6a65] hover:text-[#2b2622] font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl p-4 mb-6 font-medium italic">
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black">Coupon Code</label>
                <input 
                  type="text" 
                  name="code"
                  required
                  placeholder="e.g. SACRED30"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full bg-[#f8f6f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 outline-none uppercase font-mono tracking-wider placeholder:text-[#6f6a65]/30 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black">Discount Type</label>
                  <select 
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleInputChange}
                    className="w-full bg-[#f8f6f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 outline-none font-bold"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black">Discount Value</label>
                  <input 
                    type="number" 
                    name="discountValue"
                    required
                    min="0"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    className="w-full bg-[#f8f6f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black">Min Purchase (₹)</label>
                  <input 
                    type="number" 
                    name="minPurchase"
                    min="0"
                    value={formData.minPurchase}
                    onChange={handleInputChange}
                    className="w-full bg-[#f8f6f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 outline-none font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black">Expiry Date</label>
                  <input 
                    type="date" 
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleInputChange}
                    className="w-full bg-[#f8f6f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black">Marquee Text (Description)</label>
                <textarea 
                  name="description"
                  required
                  rows="3"
                  placeholder="e.g. 10% OFF ON FIRST ORDERS • FREE SHIPPING OVER ₹799"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full bg-[#f8f6f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 outline-none italic placeholder:text-[#6f6a65]/30 leading-relaxed font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black">Usage Limit</label>
                  <input
                    type="number"
                    name="usageLimit"
                    min="0"
                    placeholder="Unlimited"
                    value={formData.usageLimit}
                    onChange={handleInputChange}
                    className="w-full bg-[#f8f6f2] border-0 rounded-xl px-4 py-3 text-sm text-[#2b2622] focus:ring-2 focus:ring-[#b89b5e]/20 outline-none font-bold"
                  />
                </div>
                <div className="flex flex-col justify-end gap-3 pb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="firstOrderOnly"
                      name="firstOrderOnly"
                      checked={formData.firstOrderOnly}
                      onChange={handleInputChange}
                      className="w-4 h-4 accent-[#b89b5e] rounded cursor-pointer"
                    />
                    <label htmlFor="firstOrderOnly" className="text-xs font-bold text-[#6f6a65] uppercase tracking-widest select-none cursor-pointer">
                      First order only
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleInputChange}
                      className="w-4 h-4 accent-[#b89b5e] rounded cursor-pointer"
                    />
                    <label htmlFor="isActive" className="text-xs font-bold text-[#6f6a65] uppercase tracking-widest select-none cursor-pointer">
                      Activate immediately
                    </label>
                  </div>
                </div>
              </div>

              {/* Product Restrictions */}
              <div className="border-t border-[#f2eee9] pt-4 mt-4 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">Product Restrictions</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Applicable Products (Whitelist) */}
                  <div className="relative" ref={appProductsRef}>
                    <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black block mb-1">
                      Only for Specific Products
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAppProductsDropdownOpen(!appProductsDropdownOpen);
                        setExProductsDropdownOpen(false);
                      }}
                      className="w-full bg-[#f8f6f2] rounded-xl px-4 py-3 text-sm text-[#2b2622] outline-none font-bold text-left flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">
                        {formData.applicableProducts?.length > 0
                          ? `${formData.applicableProducts.length} selected`
                          : "All Products Eligible"}
                      </span>
                      <span className="text-xs text-[#b89b5e]">▼</span>
                    </button>
                    {appProductsDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-[#dcd4cb] rounded-xl shadow-xl z-[9999] max-h-48 overflow-y-auto p-2 space-y-1">
                        {products.length === 0 ? (
                          <div className="text-xs text-[#6f6a65]/40 italic p-2">No products available</div>
                        ) : (
                          products.map((prod) => {
                            const isSelected = formData.applicableProducts?.includes(prod._id);
                            return (
                              <label key={prod._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#f8f6f2] rounded-lg cursor-pointer text-xs font-bold text-[#2b2622] select-none">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const nextList = isSelected
                                      ? formData.applicableProducts.filter(id => id !== prod._id)
                                      : [...(formData.applicableProducts || []), prod._id];
                                    setFormData(prev => ({ ...prev, applicableProducts: nextList }));
                                  }}
                                  className="w-3.5 h-3.5 accent-[#b89b5e] rounded"
                                />
                                <span className="truncate">{prod.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Excluded Products (Blacklist) */}
                  <div className="relative" ref={exProductsRef}>
                    <label className="text-[10px] uppercase tracking-widest text-[#6f6a65] font-black block mb-1">
                      Exclude Specific Products
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setExProductsDropdownOpen(!exProductsDropdownOpen);
                        setAppProductsDropdownOpen(false);
                      }}
                      className="w-full bg-[#f8f6f2] rounded-xl px-4 py-3 text-sm text-[#2b2622] outline-none font-bold text-left flex justify-between items-center cursor-pointer"
                    >
                      <span className="truncate">
                        {formData.excludedProducts?.length > 0
                          ? `${formData.excludedProducts.length} excluded`
                          : "No Exclusions"}
                      </span>
                      <span className="text-xs text-[#b89b5e]">▼</span>
                    </button>
                    {exProductsDropdownOpen && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-[#dcd4cb] rounded-xl shadow-xl z-[9999] max-h-48 overflow-y-auto p-2 space-y-1">
                        {products.length === 0 ? (
                          <div className="text-xs text-[#6f6a65]/40 italic p-2">No products available</div>
                        ) : (
                          products.map((prod) => {
                            const isSelected = formData.excludedProducts?.includes(prod._id);
                            return (
                              <label key={prod._id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#f8f6f2] rounded-lg cursor-pointer text-xs font-bold text-[#2b2622] select-none">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    const nextList = isSelected
                                      ? formData.excludedProducts.filter(id => id !== prod._id)
                                      : [...(formData.excludedProducts || []), prod._id];
                                    setFormData(prev => ({ ...prev, excludedProducts: nextList }));
                                  }}
                                  className="w-3.5 h-3.5 accent-[#b89b5e] rounded"
                                />
                                <span className="truncate">{prod.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full py-4 bg-[#2b2622] hover:bg-[#b89b5e] text-white font-bold uppercase tracking-[0.2em] text-xs rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer mt-4 flex items-center justify-center gap-3"
              >
                {formLoading ? (
                  <LoadingSpinner color="border-white" />
                ) : (
                  editingCoupon ? "Save Changes" : "Apply to Temple"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
