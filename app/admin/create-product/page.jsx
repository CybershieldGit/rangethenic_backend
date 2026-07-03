"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProduct, uploadImage, uploadVideo, fetchCategories, fetchAttributes } from "@/utils/api";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

// The two fixed main categories. Subcategories are managed on the Categories page.
const MAIN_CATEGORIES = ["Clothing", "Jewellery"];

export default function CreateProductPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "", price: 0, discountPercentage: 0, shortDescription: "", longDescription: "", images: "",
    category: "", subCategory: "", countInStock: 0, isBestSeller: false,
    isCODAllowed: true,
    sizes: [], colors: [], fabrics: [], works: [], metals: [], jewelColors: []
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [notification, setNotification] = useState(null);

  // Category state
  const [categories, setCategories] = useState([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryRef = useRef(null);

  // Subcategory state
  const [subDropdownOpen, setSubDropdownOpen] = useState(false);
  const subRef = useRef(null);

  // Attribute Dropdown states & refs
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const sizeRef = useRef(null);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const colorRef = useRef(null);
  const [fabricDropdownOpen, setFabricDropdownOpen] = useState(false);
  const fabricRef = useRef(null);
  const [workDropdownOpen, setWorkDropdownOpen] = useState(false);
  const workRef = useRef(null);
  const [metalDropdownOpen, setMetalDropdownOpen] = useState(false);
  const metalRef = useRef(null);
  const [jewelColorDropdownOpen, setJewelColorDropdownOpen] = useState(false);
  const jewelColorRef = useRef(null);

  const selectedCategory = categories.find((c) => c.name.toLowerCase() === formData.category.toLowerCase());
  const subcategories = selectedCategory?.subcategories || [];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
      if (subRef.current && !subRef.current.contains(e.target)) {
        setSubDropdownOpen(false);
      }
      if (sizeRef.current && !sizeRef.current.contains(e.target)) {
        setSizeDropdownOpen(false);
      }
      if (colorRef.current && !colorRef.current.contains(e.target)) {
        setColorDropdownOpen(false);
      }
      if (fabricRef.current && !fabricRef.current.contains(e.target)) {
        setFabricDropdownOpen(false);
      }
      if (workRef.current && !workRef.current.contains(e.target)) {
        setWorkDropdownOpen(false);
      }
      if (metalRef.current && !metalRef.current.contains(e.target)) {
        setMetalDropdownOpen(false);
      }
      if (jewelColorRef.current && !jewelColorRef.current.contains(e.target)) {
        setJewelColorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const imageList = formData.images ? formData.images.split(',').filter(Boolean) : [];

  // Fetch categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    loadCategories();
  }, []);

  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableFabrics, setAvailableFabrics] = useState([]);
  const [availableWorks, setAvailableWorks] = useState([]);
  const [availableMetals, setAvailableMetals] = useState([]);
  const [availableJewelColors, setAvailableJewelColors] = useState([]);

  useEffect(() => {
    const loadAttributes = async () => {
      try {
        const allAttrs = await fetchAttributes();
        setAvailableSizes(allAttrs.filter(a => a.type === "size").map(a => a.value));
        setAvailableColors(allAttrs.filter(a => a.type === "color").map(a => a.value));
        setAvailableFabrics(allAttrs.filter(a => a.type === "fabric").map(a => a.value));
        setAvailableWorks(allAttrs.filter(a => a.type === "work").map(a => a.value));
        setAvailableMetals(allAttrs.filter(a => a.type === "metal").map(a => a.value));
        setAvailableJewelColors(allAttrs.filter(a => a.type === "jewel_color").map(a => a.value));
      } catch (err) {
        console.error("Failed to load options:", err);
      }
    };
    loadAttributes();
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImage(true);
    setCreateError("");
    try {
      const urls = await Promise.all(files.map(async (file) => {
        const uploadData = new FormData();
        uploadData.append("image", file);
        const data = await uploadImage(uploadData);
        return data.url;
      }));
      setFormData((prev) => {
        const existing = prev.images ? prev.images.split(",").map(u => u.trim()).filter(Boolean) : [];
        return { ...prev, images: [...existing, ...urls].join(", ") };
      });
      showNotification(`${urls.length} image(s) uploaded successfully.`);
    } catch (err) {
      setCreateError(err.message || "Failed to upload images");
    } finally { setUploadingImage(false); }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Client-side 50MB check
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_VIDEO_SIZE) {
      setCreateError("Video file size exceeds the 50MB limit.");
      e.target.value = "";
      return;
    }

    setUploadingVideo(true);
    setCreateError("");
    try {
      const uploadData = new FormData();
      uploadData.append("video", file);
      const data = await uploadVideo(uploadData);
      setVideoUrl(data.url);
      showNotification("Video uploaded successfully.");
    } catch (err) {
      setCreateError(err.message || "Failed to upload video");
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalVal = type === "checkbox" ? checked : (type === "number" ? Number(value) : value);
    if (name === "discountPercentage" && type === "number") {
      finalVal = Math.min(100, Math.max(0, finalVal));
    }
    setFormData((prev) => ({
      ...prev,
      [name]: finalVal,
    }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError("");
    try {
      const imageUrls = formData.images.split(",").map(i => i.trim()).filter(Boolean);
      if (imageUrls.length === 0) throw new Error("At least one product image is required.");
      const isJewellery = formData.category?.toLowerCase() === "jewellery";
      await createProduct({
        ...formData,
        images: imageUrls,
        image: imageUrls[0],
        video: videoUrl,
        sizes: isJewellery ? [] : formData.sizes,
        colors: isJewellery ? [] : formData.colors,
        fabrics: isJewellery ? [] : formData.fabrics,
        works: isJewellery ? [] : formData.works,
        metals: isJewellery ? formData.metals : [],
        jewelColors: isJewellery ? formData.jewelColors : []
      });
      showNotification(`${formData.name} successfully created.`);
      setTimeout(() => router.push("/admin/products"), 1200);
    } catch (err) {
      setCreateError(err.message || "Failed to create product");
    } finally { setCreateLoading(false); }
  };

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

      {/* Header — matching Temple Catalog style */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 md:gap-10 mb-12 md:mb-20 px-4 sm:px-0">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-4">— Add Product —</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-3 md:mb-4">Create Product</h1>
          <p className="text-[#6f6a65] text-xs md:text-sm max-w-lg leading-relaxed opacity-60 italic">Add a new product to the catalog. Fill in every detail to save this product.</p>
        </div>
        <Link
          href="/admin/products"
          className="bg-[#2b2622] text-white w-full xl:w-auto text-center px-6 py-4 md:px-10 md:py-5 rounded-[20px] md:rounded-[28px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-[#b89b5e] transition-all shadow-[0_20px_40px_rgba(43,38,34,0.15)] hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(184,155,94,0.25)] active:scale-95 group"
        >
          <span className="flex items-center justify-center xl:justify-start gap-3">
            <span className="text-lg md:text-xl group-hover:-translate-x-1 transition-transform inline-block">←</span> Back to Catalog
          </span>
        </Link>
      </div>

      <form onSubmit={handleCreateSubmit} className="space-y-6 px-4 sm:px-0">
        {/* === Section 1: Identity === */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-[#b89b5e]/10 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#b89b5e]">01</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">Identity</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">Product Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleFormChange} required
                placeholder="e.g. Amber & Sandalwood Incense"
                className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold placeholder:text-[#6f6a65]/30 placeholder:italic"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">Category</label>
              <div className="relative" ref={categoryRef}>
                {/* Custom dropdown trigger */}
                <button type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className={`w-full p-3.5 rounded-2xl border bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between ${
                    categoryDropdownOpen ? 'border-[#b89b5e] ring-2 ring-[#b89b5e]/20' : 'border-[#e8e1d9]'
                  }`}
                >
                  <span className={formData.category ? 'text-[#2b2622]' : 'text-[#6f6a65]/30 italic'}>
                    {formData.category || 'Select a category...'}
                  </span>
                  <svg className={`w-4 h-4 text-[#6f6a65]/40 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {/* Custom dropdown panel — only the two fixed main categories */}
                {categoryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden max-h-56 overflow-y-auto">
                    {MAIN_CATEGORIES.map((catName) => (
                      <button key={catName} type="button"
                        onClick={() => {
                          const isJewellery = catName.toLowerCase() === "jewellery";
                          setFormData(prev => ({
                            ...prev,
                            category: catName,
                            subCategory: "",
                            fabrics: isJewellery ? [] : prev.fabrics,
                            works: isJewellery ? [] : prev.works,
                            sizes: isJewellery ? [] : prev.sizes,
                            colors: isJewellery ? [] : prev.colors,
                            metals: isJewellery ? prev.metals : [],
                            jewelColors: isJewellery ? prev.jewelColors : [],
                          }));
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 text-sm font-semibold transition-all flex items-center justify-between ${
                          formData.category === catName
                            ? 'bg-[#b89b5e]/10 text-[#b89b5e]'
                            : 'text-[#2b2622] hover:bg-[#fcfbf9]'
                        }`}
                      >
                        <span>{catName}</span>
                        {formData.category === catName && (
                          <svg className="w-4 h-4 text-[#b89b5e]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {/* Hidden required input for form validation */}
                <input type="text" value={formData.category} required className="sr-only" tabIndex={-1} onChange={() => {}} />
              </div>
            </div>

            {/* Subcategory */}
            {formData.category && (
              <div>
                <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">
                  Subcategory <span className="text-[#b89b5e] normal-case font-bold">(optional)</span>
                </label>
                <div className="relative" ref={subRef}>
                  <button type="button"
                    onClick={() => setSubDropdownOpen(!subDropdownOpen)}
                    className={`w-full p-3.5 rounded-2xl border bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between ${
                      subDropdownOpen ? 'border-[#b89b5e] ring-2 ring-[#b89b5e]/20' : 'border-[#e8e1d9]'
                    }`}
                  >
                    <span className={formData.subCategory ? 'text-[#2b2622]' : 'text-[#6f6a65]/30 italic'}>
                      {formData.subCategory || 'Select a subcategory...'}
                    </span>
                    <svg className={`w-4 h-4 text-[#6f6a65]/40 transition-transform duration-200 ${subDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  {subDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden max-h-56 overflow-y-auto">
                      {formData.subCategory && (
                        <button type="button"
                          onClick={() => { setFormData(prev => ({ ...prev, subCategory: "" })); setSubDropdownOpen(false); }}
                          className="w-full text-left px-5 py-3 text-sm font-semibold text-[#6f6a65]/60 italic hover:bg-[#fcfbf9] transition-all"
                        >
                          Clear selection
                        </button>
                      )}
                      {subcategories.length === 0 ? (
                        <div className="p-4 text-center text-[#6f6a65]/40 text-xs italic">No subcategories yet. Add them from the Categories page in the sidebar.</div>
                      ) : (
                        subcategories.map((sub, idx) => (
                          <button key={idx} type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, subCategory: sub }));
                              setSubDropdownOpen(false);
                            }}
                            className={`w-full text-left px-5 py-3 text-sm font-semibold transition-all flex items-center justify-between ${
                              formData.subCategory === sub ? 'bg-[#b89b5e]/10 text-[#b89b5e]' : 'text-[#2b2622] hover:bg-[#fcfbf9]'
                            }`}
                          >
                            <span>{sub}</span>
                            {formData.subCategory === sub && (
                              <svg className="w-4 h-4 text-[#b89b5e]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* === Section 2: Filter === */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-7 h-7 rounded-full bg-[#b89b5e]/10 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#b89b5e]">02</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">Filter</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Size Filter Dropdown */}
            {formData.category?.toLowerCase() !== "jewellery" && (
              <div ref={sizeRef}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#6f6a65]">Size</span>
                  <span className="text-[10px] uppercase font-black text-[#b89b5e] bg-[#b89b5e]/10 px-2.5 py-1 rounded-full">{formData.sizes.length} selected</span>
                </div>
                <div className="relative mt-2">
                  <button
                    type="button"
                    onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                    className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between"
                  >
                    <span className={formData.sizes.length > 0 ? "text-[#2b2622]" : "text-[#6f6a65]/30 italic"}>
                      {formData.sizes.length > 0 ? formData.sizes.join(", ") : "Select Sizes..."}
                    </span>
                    <svg className="w-4 h-4 text-[#6f6a65]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {sizeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden p-3 space-y-1.5 max-h-56 overflow-y-auto">
                      {availableSizes.length === 0 ? (
                        <div className="p-3 text-center text-[#6f6a65]/40 text-xs italic">No sizes created. Add sizes in the left sidebar.</div>
                      ) : (
                        availableSizes.map((sz) => {
                          const selected = formData.sizes.includes(sz);
                          return (
                            <label key={sz} className="flex items-center gap-3 px-3 py-2 hover:bg-[#fcfbf9] rounded-xl cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const newSizes = selected
                                    ? formData.sizes.filter(s => s !== sz)
                                    : [...formData.sizes, sz];
                                  setFormData(prev => ({ ...prev, sizes: newSizes }));
                                }}
                                className="w-4 h-4 rounded border-[#e8e1d9] text-[#b89b5e] focus:ring-[#b89b5e]"
                              />
                              <span className="text-xs font-semibold text-[#2b2622]">{sz}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Metal Filter Dropdown */}
            {formData.category?.toLowerCase() === "jewellery" && (
              <div ref={metalRef}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#6f6a65]">Metal</span>
                  <span className="text-[10px] uppercase font-black text-[#b89b5e] bg-[#b89b5e]/10 px-2.5 py-1 rounded-full">{formData.metals.length} selected</span>
                </div>
                <div className="relative mt-2">
                  <button
                    type="button"
                    onClick={() => setMetalDropdownOpen(!metalDropdownOpen)}
                    className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between"
                  >
                    <span className={formData.metals.length > 0 ? "text-[#2b2622]" : "text-[#6f6a65]/30 italic"}>
                      {formData.metals.length > 0 ? formData.metals.join(", ") : "Select Metals..."}
                    </span>
                    <svg className="w-4 h-4 text-[#6f6a65]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {metalDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden p-3 space-y-1.5 max-h-56 overflow-y-auto">
                      {availableMetals.length === 0 ? (
                        <div className="p-3 text-center text-[#6f6a65]/40 text-xs italic">No metals created. Add metals in the left sidebar.</div>
                      ) : (
                        availableMetals.map((m) => {
                          const selected = formData.metals.includes(m);
                          return (
                            <label key={m} className="flex items-center gap-3 px-3 py-2 hover:bg-[#fcfbf9] rounded-xl cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const newMetals = selected
                                    ? formData.metals.filter(item => item !== m)
                                    : [...formData.metals, m];
                                  setFormData(prev => ({ ...prev, metals: newMetals }));
                                }}
                                className="w-4 h-4 rounded border-[#e8e1d9] text-[#b89b5e] focus:ring-[#b89b5e]"
                              />
                              <span className="text-xs font-semibold text-[#2b2622]">{m}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Color Filter Dropdown */}
            {formData.category?.toLowerCase() !== "jewellery" && (
              <div ref={colorRef}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#6f6a65]">Color</span>
                  <span className="text-[10px] uppercase font-black text-[#b89b5e] bg-[#b89b5e]/10 px-2.5 py-1 rounded-full">{formData.colors.length} selected</span>
                </div>
                <div className="relative mt-2">
                  <button
                    type="button"
                    onClick={() => setColorDropdownOpen(!colorDropdownOpen)}
                    className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between"
                  >
                    <span className={formData.colors.length > 0 ? "text-[#2b2622]" : "text-[#6f6a65]/30 italic"}>
                      {formData.colors.length > 0 
                        ? formData.colors.map(c => c.includes("|") ? c.split("|")[0] : c).join(", ") 
                        : "Select Colors..."}
                    </span>
                    <svg className="w-4 h-4 text-[#6f6a65]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {colorDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden p-3 space-y-1.5 max-h-56 overflow-y-auto">
                      {availableColors.length === 0 ? (
                        <div className="p-3 text-center text-[#6f6a65]/40 text-xs italic">No colors created. Add colors in the left sidebar.</div>
                      ) : (
                        availableColors.map((col) => {
                          const hasPipe = col.includes("|");
                          const name = hasPipe ? col.split("|")[0] : col;
                          const hex = hasPipe ? col.split("|")[1] : "#CCCCCC";
                          const selected = formData.colors.includes(col);
                          return (
                            <label key={col} className="flex items-center gap-3 px-3 py-2 hover:bg-[#fcfbf9] rounded-xl cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const newCols = selected
                                    ? formData.colors.filter(c => c !== col)
                                    : [...formData.colors, col];
                                  setFormData(prev => ({ ...prev, colors: newCols }));
                                }}
                                className="w-4 h-4 rounded border-[#e8e1d9] text-[#b89b5e] focus:ring-[#b89b5e]"
                              />
                              <div 
                                className="w-4 h-4 rounded-full border border-stone-200 shadow-sm shrink-0" 
                                style={{ backgroundColor: hex }}
                              />
                              <span className="text-xs font-semibold text-[#2b2622]">{name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Jewel Color Filter Dropdown */}
            {formData.category?.toLowerCase() === "jewellery" && (
              <div ref={jewelColorRef}>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#6f6a65]">Jewel Color</span>
                  <span className="text-[10px] uppercase font-black text-[#b89b5e] bg-[#b89b5e]/10 px-2.5 py-1 rounded-full">{formData.jewelColors.length} selected</span>
                </div>
                <div className="relative mt-2">
                  <button
                    type="button"
                    onClick={() => setJewelColorDropdownOpen(!jewelColorDropdownOpen)}
                    className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between"
                  >
                    <span className={formData.jewelColors.length > 0 ? "text-[#2b2622]" : "text-[#6f6a65]/30 italic"}>
                      {formData.jewelColors.length > 0 
                        ? formData.jewelColors.map(c => c.includes("|") ? c.split("|")[0] : c).join(", ") 
                        : "Select Jewel Colors..."}
                    </span>
                    <svg className="w-4 h-4 text-[#6f6a65]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                  {jewelColorDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden p-3 space-y-1.5 max-h-56 overflow-y-auto">
                      {availableJewelColors.length === 0 ? (
                        <div className="p-3 text-center text-[#6f6a65]/40 text-xs italic">No jewel colors created. Add jewel colors in the left sidebar.</div>
                      ) : (
                        availableJewelColors.map((col) => {
                          const hasPipe = col.includes("|");
                          const name = hasPipe ? col.split("|")[0] : col;
                          const hex = hasPipe ? col.split("|")[1] : "#CCCCCC";
                          const selected = formData.jewelColors.includes(col);
                          return (
                            <label key={col} className="flex items-center gap-3 px-3 py-2 hover:bg-[#fcfbf9] rounded-xl cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => {
                                  const newCols = selected
                                    ? formData.jewelColors.filter(c => c !== col)
                                    : [...formData.jewelColors, col];
                                  setFormData(prev => ({ ...prev, jewelColors: newCols }));
                                }}
                                className="w-4 h-4 rounded border-[#e8e1d9] text-[#b89b5e] focus:ring-[#b89b5e]"
                              />
                              <div 
                                className="w-4 h-4 rounded-full border border-stone-200 shadow-sm shrink-0" 
                                style={{ backgroundColor: hex }}
                              />
                              <span className="text-xs font-semibold text-[#2b2622]">{name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {formData.category?.toLowerCase() !== "jewellery" && (
              <>
                {/* Fabric Filter Dropdown */}
                <div ref={fabricRef}>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-black uppercase tracking-widest text-[#6f6a65]">Fabric</span>
                    <span className="text-[10px] uppercase font-black text-[#b89b5e] bg-[#b89b5e]/10 px-2.5 py-1 rounded-full">{formData.fabrics.length} selected</span>
                  </div>
                  <div className="relative mt-2">
                    <button
                      type="button"
                      onClick={() => setFabricDropdownOpen(!fabricDropdownOpen)}
                      className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between"
                    >
                      <span className={formData.fabrics.length > 0 ? "text-[#2b2622]" : "text-[#6f6a65]/30 italic"}>
                        {formData.fabrics.length > 0 ? formData.fabrics.join(", ") : "Select Fabrics..."}
                      </span>
                      <svg className="w-4 h-4 text-[#6f6a65]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {fabricDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden p-3 space-y-1.5 max-h-56 overflow-y-auto">
                        {availableFabrics.length === 0 ? (
                          <div className="p-3 text-center text-[#6f6a65]/40 text-xs italic">No fabrics created. Add fabrics in the left sidebar.</div>
                        ) : (
                          availableFabrics.map((fab) => {
                            const selected = formData.fabrics.includes(fab);
                            return (
                              <label key={fab} className="flex items-center gap-3 px-3 py-2 hover:bg-[#fcfbf9] rounded-xl cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const newFabs = selected
                                      ? formData.fabrics.filter(f => f !== fab)
                                      : [...formData.fabrics, fab];
                                    setFormData(prev => ({ ...prev, fabrics: newFabs }));
                                  }}
                                  className="w-4 h-4 rounded border-[#e8e1d9] text-[#b89b5e] focus:ring-[#b89b5e]"
                                />
                                <span className="text-xs font-semibold text-[#2b2622]">{fab}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Work Filter Dropdown */}
                <div ref={workRef}>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs font-black uppercase tracking-widest text-[#6f6a65]">Work</span>
                    <span className="text-[10px] uppercase font-black text-[#b89b5e] bg-[#b89b5e]/10 px-2.5 py-1 rounded-full">{formData.works.length} selected</span>
                  </div>
                  <div className="relative mt-2">
                    <button
                      type="button"
                      onClick={() => setWorkDropdownOpen(!workDropdownOpen)}
                      className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] outline-none text-sm transition-all text-left font-semibold cursor-pointer flex items-center justify-between"
                    >
                      <span className={formData.works.length > 0 ? "text-[#2b2622]" : "text-[#6f6a65]/30 italic"}>
                        {formData.works.length > 0 ? formData.works.join(", ") : "Select Works..."}
                      </span>
                      <svg className="w-4 h-4 text-[#6f6a65]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    {workDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e8e1d9] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] z-50 overflow-hidden p-3 space-y-1.5 max-h-56 overflow-y-auto">
                        {availableWorks.length === 0 ? (
                          <div className="p-3 text-center text-[#6f6a65]/40 text-xs italic">No works created. Add works in the left sidebar.</div>
                        ) : (
                          availableWorks.map((wk) => {
                            const selected = formData.works.includes(wk);
                            return (
                              <label key={wk} className="flex items-center gap-3 px-3 py-2 hover:bg-[#fcfbf9] rounded-xl cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {
                                    const newWorks = selected
                                      ? formData.works.filter(w => w !== wk)
                                      : [...formData.works, wk];
                                    setFormData(prev => ({ ...prev, works: newWorks }));
                                  }}
                                  className="w-4 h-4 rounded border-[#e8e1d9] text-[#b89b5e] focus:ring-[#b89b5e]"
                                />
                                <span className="text-xs font-semibold text-[#2b2622]">{wk}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* === Section 3: Pricing & Stock === */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-[#b89b5e]/10 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#b89b5e]">03</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">Pricing & Inventory</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">Price (₹)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b89b5e] font-bold text-sm">₹</span>
                <input type="number" name="price" value={formData.price} onChange={handleFormChange} required min="0" step="0.01"
                  className="w-full p-3.5 pl-9 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">Discount (%)</label>
              <div className="relative">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b89b5e] font-bold text-sm">%</span>
                <input type="number" name="discountPercentage" value={formData.discountPercentage} onChange={handleFormChange} required min="0" max="100" step="1"
                  className="w-full p-3.5 pr-9 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">Stock Quantity</label>
              <input type="number" name="countInStock" value={formData.countInStock} onChange={handleFormChange} required min="0"
                className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="flex items-center gap-4 bg-[#fcfbf9] p-3.5 rounded-2xl border border-[#e8e1d9]">
              <input type="checkbox" name="isBestSeller" checked={formData.isBestSeller} onChange={handleFormChange} id="isBestSeller"
                className="w-5 h-5 accent-[#b89b5e] cursor-pointer rounded"
              />
              <div>
                <label htmlFor="isBestSeller" className="text-[10px] font-black uppercase tracking-widest text-[#2b2622] cursor-pointer block">Mark as Most Sellings</label>
                <p className="text-[9px] text-[#6f6a65]/60 italic mt-0.5">This product will appear in the most sellings section</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-[#fcfbf9] p-3.5 rounded-2xl border border-[#e8e1d9]">
              <input type="checkbox" name="isCODAllowed" checked={formData.isCODAllowed} onChange={handleFormChange} id="isCODAllowed"
                className="w-5 h-5 accent-[#b89b5e] cursor-pointer rounded"
              />
              <div>
                <label htmlFor="isCODAllowed" className="text-[10px] font-black uppercase tracking-widest text-[#2b2622] cursor-pointer block">Allow Cash on Delivery (COD)</label>
                <p className="text-[9px] text-[#6f6a65]/60 italic mt-0.5">Allow users to pay with Cash on Delivery at checkout</p>
              </div>
            </div>
          </div>
        </div>

        {/* === Section 4: Media & Description === */}
        <div className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-7 h-7 rounded-full bg-[#b89b5e]/10 flex items-center justify-center">
              <span className="text-[9px] font-black text-[#b89b5e]">04</span>
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-[#2b2622]">Media & Description</h3>
          </div>

          {/* Image Upload */}
          <div className="mb-5">
            <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-3 ml-1">Product Images</label>

            {/* Main Hero Image Dropzone */}
            <div className="relative group/upload border-2 border-dashed border-[#dcd4cb] rounded-2xl bg-[#fcfbf9] hover:bg-[#f7f6f1] hover:border-[#b89b5e] transition-all duration-300 cursor-pointer overflow-hidden aspect-[16/9]">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploadingImage} />
              {imageList.length > 0 ? (
                <div className="absolute inset-0">
                  <img src={imageList[0].trim()} className="w-full h-full object-cover" alt="Main product" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity"></div>
                  <div className="absolute bottom-3 left-3 bg-[#b89b5e] text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">Main Image</div>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation();
                      const remaining = formData.images.split(',').map(u => u.trim()).filter((_, i) => i !== 0).join(', ');
                      setFormData(prev => ({ ...prev, images: remaining }));
                    }}
                    className="absolute top-3 right-3 z-20 w-8 h-8 rounded-xl bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover/upload:opacity-100 transition-opacity cursor-pointer hover:bg-red-600 shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <LoadingSpinner size="w-6 h-6" color="border-[#b89b5e]" />
                      <span className="text-[9px] uppercase font-black tracking-widest text-[#b89b5e] animate-pulse">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-[#b89b5e]/10 flex items-center justify-center mb-3 group-hover/upload:scale-110 transition-transform duration-300">
                        <svg className="w-5 h-5 text-[#b89b5e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-[#2b2622] mb-1">Drop main image here</span>
                      <span className="text-[9px] font-bold text-[#6f6a65]/40 uppercase tracking-wider">This will be the hero & thumbnail</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Additional images row + Add button */}
            <div className="flex items-center gap-2.5 mt-3 flex-wrap">
              {imageList.slice(1).map((imgUrl, index) => (
                <div key={index + 1} className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 border-[#e8e1d9] group/thumb shadow-sm hover:shadow-md transition-all flex-shrink-0">
                  <img src={imgUrl.trim()} className="w-full h-full object-cover" alt={`Additional ${index + 1}`} />
                  <button type="button"
                    onClick={() => {
                      const actualIndex = index + 1;
                      const remaining = formData.images.split(',').map(u => u.trim()).filter((_, i) => i !== actualIndex).join(', ');
                      setFormData(prev => ({ ...prev, images: remaining }));
                    }}
                    className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}

              {/* Small + button */}
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 border-dashed border-[#dcd4cb] bg-[#fcfbf9] hover:border-[#b89b5e] hover:bg-[#f7f6f1] transition-all cursor-pointer flex items-center justify-center group/add flex-shrink-0">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={uploadingImage} multiple />
                {uploadingImage ? (
                  <LoadingSpinner size="w-4 h-4" color="border-[#b89b5e]" />
                ) : (
                  <svg className="w-5 h-5 text-[#b89b5e] group-hover/add:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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
                        <svg className="w-5 h-5 text-[#b89b5e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
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

          {/* Description Fields Group */}
          <div className="space-y-5">
            {/* Short Description */}
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">Short Description</label>
              <textarea name="shortDescription" value={formData.shortDescription} onChange={handleFormChange} required rows="2"
                placeholder="Brief summary of the product..."
                className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all resize-none text-[#2b2622] font-semibold placeholder:text-[#6f6a65]/30 placeholder:italic leading-relaxed"
              ></textarea>
              <p className="text-[9px] text-[#6f6a65]/40 italic mt-1.5 ml-1">{formData.shortDescription.length} characters (Recommended limit: 160)</p>
            </div>

            {/* Long Description */}
            <div>
              <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2 ml-1">Long Description</label>
              <textarea name="longDescription" value={formData.longDescription} onChange={handleFormChange} required rows="5"
                placeholder="Detailed description of the product..."
                className="w-full p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all resize-none text-[#2b2622] font-semibold placeholder:text-[#6f6a65]/30 placeholder:italic leading-relaxed"
              ></textarea>
              <p className="text-[9px] text-[#6f6a65]/40 italic mt-1.5 ml-1">{formData.longDescription.length} characters</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {createError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-red-500 text-sm">⚠</span>
            </div>
            <p className="text-xs font-bold text-red-600">{createError}</p>
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={createLoading}
          className={`w-full py-4 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs transition-all cursor-pointer flex items-center justify-center gap-3 ${createLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#2b2622] hover:bg-[#b89b5e] shadow-[0_15px_40px_rgba(43,38,34,0.15)] hover:shadow-[0_20px_50px_rgba(184,155,94,0.25)] hover:-translate-y-0.5'}`}
        >
          {createLoading ? (
            <><LoadingSpinner /> Creating...</>
          ) : (
            <>Create Product <span className="text-lg leading-none">→</span></>
          )}
        </button>
      </form>
    </div>
  );
}
