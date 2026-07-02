"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchProductById,
  updateProduct,
  uploadImage,
  uploadVideo,
  fetchCategories,
  createCategory as createCategoryAPI,
  deleteCategory as deleteCategoryAPI,
} from "@/utils/api";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

export default function EditProductPage({ params }) {
  const router = useRouter();
  const { id } = use(params);

  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    description: "",
    images: "",
    category: "",
    countInStock: 0,
    isBestSeller: false,
    isCODAllowed: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [notification, setNotification] = useState(null);

  // Category state
  const [categories, setCategories] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const imageList = formData.images
    ? formData.images.split(",").map((u) => u.trim()).filter(Boolean)
    : [];

  // Fetch product and categories on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [product, cats] = await Promise.all([
          fetchProductById(id),
          fetchCategories(),
        ]);
        setFormData({
          name: product.name || "",
          price: product.price || 0,
          description: product.description || "",
          images: product.images ? product.images.join(", ") : (product.image || ""),
          category: product.category || "",
          countInStock: product.countInStock || 0,
          isBestSeller: product.isBestSeller || false,
          isCODAllowed: product.isCODAllowed !== undefined ? product.isCODAllowed : true,
        });
        setCategories(cats);
        setVideoUrl(product.video || "");
      } catch (err) {
        console.error("Failed to load edit page data:", err);
        setSubmitError(err.message || "Failed to load product details");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImage(true);
    setSubmitError("");
    try {
      const urls = await Promise.all(
        files.map(async (file) => {
          const uploadData = new FormData();
          uploadData.append("image", file);
          const data = await uploadImage(uploadData);
          return data.url;
        })
      );
      setFormData((prev) => {
        const existing = prev.images
          ? prev.images.split(",").map((u) => u.trim()).filter(Boolean)
          : [];
        return { ...prev, images: [...existing, ...urls].join(", ") };
      });
      showNotification(`${urls.length} image(s) uploaded successfully.`);
    } catch (err) {
      setSubmitError(err.message || "Failed to upload images");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side 50MB check
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_VIDEO_SIZE) {
      setSubmitError("Video file size exceeds the 50MB limit.");
      e.target.value = "";
      return;
    }

    setUploadingVideo(true);
    setSubmitError("");
    try {
      const uploadData = new FormData();
      uploadData.append("video", file);
      const data = await uploadVideo(uploadData);
      setVideoUrl(data.url);
      showNotification("Video uploaded successfully.");
    } catch (err) {
      setSubmitError(err.message || "Failed to upload video");
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : type === "number"
          ? Number(value)
          : value,
    }));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError("");
    try {
      const imageUrls = formData.images
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
      if (imageUrls.length === 0)
        throw new Error("At least one product image is required.");
      
      await updateProduct(id, {
        ...formData,
        images: imageUrls,
        image: imageUrls[0],
        video: videoUrl,
      });
      
      showNotification(`${formData.name} successfully updated.`);
      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (err) {
      setSubmitError(err.message || "Failed to update product");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <div className="w-12 h-12 border-4 border-[#b89b5e] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Premium Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-12 right-12 z-[100] px-8 py-5 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all animate-in slide-in-from-right duration-500 flex items-center gap-4 ${
            notification.type === "success"
              ? "bg-[#2b2622] text-white border-l-4 border-[#b89b5e]"
              : "bg-red-600 text-white"
          }`}
        >
          <div className="w-2 h-2 bg-[#b89b5e] rounded-full animate-pulse"></div>
          <p className="text-xs font-bold uppercase tracking-widest">
            {notification.message}
          </p>
        </div>
      )}

      {/* Header — matching Temple Catalog style */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-10 mb-20 px-4 sm:px-0">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[10px] block mb-4">
            — Modify Offering —
          </span>
          <h1 className="text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-4">
            Edit Ritual
          </h1>
          <p className="text-[#6f6a65] text-sm max-w-lg leading-relaxed opacity-60 italic">
            Update the details, pricing, stock, or media of this sacred offering.
          </p>
        </div>
        <Link
          href="/admin/products"
          className="bg-[#2b2622] text-white px-10 py-5 rounded-[28px] font-black text-xs uppercase tracking-[0.2em] hover:bg-[#b89b5e] transition-all shadow-[0_20px_40px_rgba(43,38,34,0.15)] hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(184,155,94,0.25)] active:scale-95 group"
        >
          <span className="flex items-center gap-3">
            <span className="text-xl group-hover:-translate-x-1 transition-transform inline-block">
              ←
            </span>{" "}
            Back to Catalog
          </span>
        </Link>
      </div>

      <form onSubmit={handleUpdateSubmit} className="space-y-6 px-4 sm:px-0">
        {/* === Section 1: Identity === */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-[#b89b5e]/10 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#b89b5e]">01</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">
              Identity
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">
                Ritual Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                placeholder="e.g. Amber & Sandalwood Incense"
                className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold placeholder:text-[#6f6a65]/30 placeholder:italic"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">
                Category
              </label>
              {showNewCategory ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold placeholder:text-[#6f6a65]/30 placeholder:italic"
                    autoFocus
                  />
                  <button
                    type="button"
                    disabled={creatingCategory || !newCategoryName.trim()}
                    onClick={async () => {
                      setCreatingCategory(true);
                      try {
                        const created = await createCategoryAPI(
                          newCategoryName.trim()
                        );
                        setCategories((prev) =>
                          [...prev, created].sort((a, b) =>
                            a.name.localeCompare(b.name)
                          )
                        );
                        setFormData((prev) => ({
                          ...prev,
                          category: created.name,
                        }));
                        setNewCategoryName("");
                        setShowNewCategory(false);
                        showNotification(`Category "${created.name}" created.`);
                      } catch (err) {
                        showNotification(err.message, "error");
                      } finally {
                        setCreatingCategory(false);
                      }
                    }}
                    className="px-4 py-3.5 rounded-2xl bg-[#2b2622] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#b89b5e] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {creatingCategory ? (
                      <LoadingSpinner size="w-3 h-3" />
                    ) : (
                      "Add"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewCategory(false);
                      setNewCategoryName("");
                    }}
                    className="px-3 py-3.5 rounded-2xl border border-[#e8e1d9] text-[#6f6a65] text-[9px] font-black uppercase tracking-widest hover:border-[#2b2622] hover:text-[#2b2622] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1" ref={categoryRef}>
                    {/* Custom dropdown trigger */}
                    <button
                      type="button"
                      onClick={() =>
                        setCategoryDropdownOpen(!categoryDropdownOpen)
                      }
                      className={`w-full p-3.5 rounded-2xl border bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between ${
                        categoryDropdownOpen
                          ? "border-[#b89b5e] ring-2 ring-[#b89b5e]/20"
                          : "border-[#e8e1d9]"
                      }`}
                    >
                      <span
                        className={
                          formData.category
                            ? "text-[#2b2622]"
                            : "text-[#6f6a65]/30 italic"
                        }
                      >
                        {formData.category || "Select a category..."}
                      </span>
                      <svg
                        className={`w-4 h-4 text-[#6f6a65]/40 transition-transform duration-200 ${
                          categoryDropdownOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                        />
                      </svg>
                    </button>

                    {/* Custom dropdown panel */}
                    {categoryDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden max-h-56 overflow-y-auto">
                        {categories.length === 0 ? (
                          <div className="p-4 text-center text-[#6f6a65]/40 text-xs italic">
                            No categories yet. Click + New to create one.
                          </div>
                        ) : (
                          categories.map((cat, idx) => (
                            <button
                              key={cat._id || cat.id || idx}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  category: cat.name,
                                }));
                                setCategoryDropdownOpen(false);
                                setConfirmDeleteCat(false);
                              }}
                              className={`w-full text-left px-5 py-3 text-sm font-semibold transition-all flex items-center justify-between group/opt ${
                                formData.category === cat.name
                                  ? "bg-[#b89b5e]/10 text-[#b89b5e]"
                                  : "text-[#2b2622] hover:bg-[#fcfbf9]"
                              }`}
                            >
                              <span>{cat.name}</span>
                              {formData.category === cat.name && (
                                <svg
                                  className="w-4 h-4 text-[#b89b5e]"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                  />
                                </svg>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {/* Hidden required input for form validation */}
                    <input
                      type="text"
                      value={formData.category}
                      required
                      className="sr-only"
                      tabIndex={-1}
                      onChange={() => {}}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="px-4 py-3.5 rounded-2xl border-2 border-dashed border-[#dcd4cb] text-[#b89b5e] hover:border-[#b89b5e] hover:bg-[#b89b5e]/5 transition-all cursor-pointer flex items-center gap-1.5"
                    title="Add new category"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>
                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">
                      New
                    </span>
                  </button>
                  {formData.category && (
                    confirmDeleteCat ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={deletingCategory}
                          onClick={async () => {
                            setDeletingCategory(true);
                            try {
                              const catToDelete = categories.find(
                                (c) => c.name === formData.category
                              );
                              if (catToDelete) {
                                await deleteCategoryAPI(catToDelete._id);
                                setCategories((prev) =>
                                  prev.filter((c) => c._id !== catToDelete._id)
                                );
                                setFormData((prev) => ({
                                  ...prev,
                                  category: "",
                                }));
                                showNotification(
                                  `Category "${catToDelete.name}" deleted.`
                                );
                              }
                            } catch (err) {
                              showNotification(err.message, "error");
                            } finally {
                              setDeletingCategory(false);
                              setConfirmDeleteCat(false);
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-red-500 text-white text-[8px] font-black uppercase tracking-widest hover:bg-red-600 transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1"
                        >
                          {deletingCategory ? (
                            <LoadingSpinner size="w-3 h-3" />
                          ) : (
                            "Yes"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCat(false)}
                          className="px-3 py-2 rounded-xl border border-[#e8e1d9] text-[#6f6a65] text-[8px] font-black uppercase tracking-widest hover:text-[#2b2622] transition-all cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCat(true)}
                        className="px-3 py-3.5 rounded-2xl border border-red-200 text-red-300 hover:border-red-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer flex items-center gap-1.5"
                        title="Delete selected category"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                          />
                        </svg>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* === Section 2: Pricing & Stock === */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-[#b89b5e]/10 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#b89b5e]">02</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">
              Pricing & Inventory
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">
                Price (₹)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b89b5e] font-bold text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleFormChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full p-3.5 pl-9 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">
                Stock Quantity
              </label>
              <input
                type="number"
                name="countInStock"
                value={formData.countInStock}
                onChange={handleFormChange}
                required
                min="0"
                className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-4 bg-[#fcfbf9] p-3.5 rounded-2xl border border-[#e8e1d9]">
              <input
                type="checkbox"
                name="isBestSeller"
                checked={formData.isBestSeller}
                onChange={handleFormChange}
                id="isBestSeller"
                className="w-5 h-5 accent-[#b89b5e] cursor-pointer rounded"
              />
              <div>
                <label
                  htmlFor="isBestSeller"
                  className="text-[10px] font-black uppercase tracking-widest text-[#2b2622] cursor-pointer block"
                >
                  Mark as Bestseller
                </label>
                <p className="text-[9px] text-[#6f6a65]/60 italic mt-0.5">
                  This product will appear in the featured section
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-[#fcfbf9] p-3.5 rounded-2xl border border-[#e8e1d9]">
              <input
                type="checkbox"
                name="isCODAllowed"
                checked={formData.isCODAllowed}
                onChange={handleFormChange}
                id="isCODAllowed"
                className="w-5 h-5 accent-[#b89b5e] cursor-pointer rounded"
              />
              <div>
                <label
                  htmlFor="isCODAllowed"
                  className="text-[10px] font-black uppercase tracking-widest text-[#2b2622] cursor-pointer block"
                >
                  Allow Cash on Delivery (COD)
                </label>
                <p className="text-[9px] text-[#6f6a65]/60 italic mt-0.5">
                  Allow users to pay with Cash on Delivery at checkout
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* === Section 3: Media & Description === */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-[#b89b5e]/10 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#b89b5e]">03</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">
              Media & Description
            </h3>
          </div>

          {/* Image Upload */}
          <div className="mb-5">
            <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-3 ml-1">
              Product Images
            </label>

            {/* Main Hero Image Dropzone */}
            <div className="relative group/upload border-2 border-dashed border-[#dcd4cb] rounded-2xl bg-[#fcfbf9] hover:bg-[#f7f6f1] hover:border-[#b89b5e] transition-all duration-300 cursor-pointer overflow-hidden aspect-[16/9]">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                disabled={uploadingImage}
              />
              {imageList.length > 0 ? (
                <div className="absolute inset-0">
                  <img
                    src={imageList[0].trim()}
                    className="w-full h-full object-cover"
                    alt="Main product"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity"></div>
                  <div className="absolute bottom-3 left-3 bg-[#b89b5e] text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                    Main Image
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const remaining = formData.images
                        .split(",")
                        .map((u) => u.trim())
                        .filter((_, i) => i !== 0)
                        .join(", ");
                      setFormData((prev) => ({ ...prev, images: remaining }));
                    }}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity cursor-pointer hover:bg-red-600 shadow-lg"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner
                        size="w-6 h-6"
                        color="border-[#b89b5e]"
                      />
                      <span className="text-[9px] uppercase font-black tracking-widest text-[#b89b5e] animate-pulse">
                        Uploading...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-[#b89b5e]/10 flex items-center justify-center mb-3 group-hover/upload:scale-110 transition-transform duration-300">
                        <svg
                          className="w-5 h-5 text-[#b89b5e]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-[#2b2622] mb-1">
                        Drop main image here
                      </span>
                      <span className="text-[9px] font-bold text-[#6f6a65]/40 uppercase tracking-wider">
                        This will be the hero & thumbnail
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Additional images row + Add button */}
            <div className="flex items-center gap-2.5 mt-3 flex-wrap">
              {imageList.slice(1).map((imgUrl, index) => (
                <div
                  key={index + 1}
                  className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-[#e8e1d9] group/thumb shadow-sm hover:shadow-md transition-all flex-shrink-0"
                >
                  <img
                    src={imgUrl.trim()}
                    className="w-full h-full object-cover"
                    alt={`Additional ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const actualIndex = index + 1;
                      const remaining = formData.images
                        .split(",")
                        .map((u) => u.trim())
                        .filter((_, i) => i !== actualIndex)
                        .join(", ");
                      setFormData((prev) => ({ ...prev, images: remaining }));
                    }}
                    className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Small + button */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-dashed border-[#dcd4cb] bg-[#fcfbf9] hover:border-[#b89b5e] hover:bg-[#f7f6f1] transition-all cursor-pointer flex items-center justify-center group/add flex-shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  disabled={uploadingImage}
                  multiple
                />
                {uploadingImage ? (
                  <LoadingSpinner size="w-4 h-4" color="border-[#b89b5e]" />
                ) : (
                  <svg
                    className="w-5 h-5 text-[#b89b5e] group-hover/add:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Video Upload */}
          <div className="mb-5">
            <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-3 ml-1">Product Video <span className="text-[#b89b5e] normal-case font-bold">(optional · max 50MB)</span></label>

            {videoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#e8e1d9] bg-black">
                <video
                  src={videoUrl}
                  controls
                  className="w-full max-h-[300px] object-contain bg-black"
                />
                <button type="button"
                  onClick={() => setVideoUrl("")}
                  className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-red-500/90 text-white flex items-center justify-center cursor-pointer hover:bg-red-600 shadow-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="absolute bottom-3 left-3 bg-[#2b2622] text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Video Attached
                </div>
              </div>
            ) : (
              <div className="relative group/video border-2 border-dashed border-[#dcd4cb] rounded-2xl bg-[#fcfbf9] hover:bg-[#f7f6f1] hover:border-[#b89b5e] transition-all duration-300 cursor-pointer overflow-hidden py-10">
                <input type="file" accept="video/*" onChange={handleVideoUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploadingVideo} />
                <div className="flex flex-col items-center justify-center text-center px-4">
                  {uploadingVideo ? (
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner size="w-6 h-6" color="border-[#b89b5e]" />
                      <span className="text-[9px] uppercase font-black tracking-widest text-[#b89b5e] animate-pulse">Uploading Video...</span>
                      <span className="text-[8px] text-[#6f6a65]/40 italic">This may take a moment for larger files</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-[#b89b5e]/10 flex items-center justify-center mb-3 group-hover/video:scale-110 transition-transform duration-300">
                        <svg
                          className="w-5 h-5 text-[#b89b5e]"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-[#2b2622] mb-1">Upload product video</span>
                      <span className="text-[9px] font-bold text-[#6f6a65]/40 uppercase tracking-wider">MP4, MOV, WEBM · Max 50MB</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">
              Sacred Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              required
              rows="4"
              placeholder="Describe the essence, origin, and ritual significance of this offering..."
              className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all resize-none text-[#2b2622] font-semibold placeholder:text-[#6f6a65]/30 placeholder:italic leading-relaxed"
            ></textarea>
            <p className="text-[9px] text-[#6f6a65]/40 italic mt-1.5 ml-1">
              {formData.description.length} characters
            </p>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-red-500 text-sm">⚠</span>
            </div>
            <p className="text-xs font-bold text-red-600">{submitError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitLoading}
          className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs transition-all cursor-pointer flex items-center justify-center gap-3 ${
            submitLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#2b2622] hover:bg-[#b89b5e] shadow-[0_15px_40px_rgba(43,38,34,0.15)] hover:shadow-[0_20px_50px_rgba(184,155,94,0.25)] hover:-translate-y-0.5"
          }`}
        >
          {submitLoading ? (
            <>
              <LoadingSpinner /> Updating...
            </>
          ) : (
            <>
              Update Ritual <span className="text-lg leading-none">→</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
