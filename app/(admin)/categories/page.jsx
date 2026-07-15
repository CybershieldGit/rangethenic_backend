"use client";

import { useState, useEffect, useMemo } from "react";
import {
  fetchCategories,
  createCategory,
  addSubcategory,
  deleteSubcategory,
  updateSubcategory,
  uploadImage,
} from "@/utils/api";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

// The two fixed main categories. These cannot be created or deleted from the panel.
const MAIN_CATEGORIES = [
  { name: "Clothing", description: "Ethnic wear and apparel" },
  { name: "Jewellery", description: "Handcrafted jewellery" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  
  // Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [filterParent, setFilterParent] = useState("all"); // 'all' | 'clothing' | 'jewellery'
  
  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubParent, setNewSubParent] = useState("Clothing");
  const [newSubImage, setNewSubImage] = useState("");
  const [uploadingNewImage, setUploadingNewImage] = useState(false);
  
  const [subToDelete, setSubToDelete] = useState(null); // { parentCategory, name }
  const [subToEdit, setSubToEdit] = useState(null); // { parentCategory, name, newName, image, key }
  const [uploadingEditImage, setUploadingEditImage] = useState(false);
  const [uploadingSubKey, setUploadingSubKey] = useState(null); // tracking image upload for existing sub

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load categories and ensure the two fixed main categories exist
  const loadCategories = async () => {
    try {
      setLoading(true);
      let data = await fetchCategories();
      const byName = new Map(data.map((c) => [c.name.toLowerCase(), c]));

      for (const main of MAIN_CATEGORIES) {
        if (!byName.has(main.name.toLowerCase())) {
          try {
            const created = await createCategory(main.name, []);
            data = [...data, created];
          } catch (err) {
            console.error(`Could not ensure category ${main.name}:`, err.message);
          }
        }
      }
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
      showNotification(err.message || "Failed to load categories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const getCategory = (name) =>
    categories.find((c) => c.name.toLowerCase() === name.toLowerCase());

  // Flattened subcategories list for table display
  const flattenedSubcategories = useMemo(() => {
    const list = [];
    categories.forEach((cat) => {
      const subs = cat.subcategories || [];
      subs.forEach((subObj) => {
        if (!subObj) return;
        const name = typeof subObj === "string" ? subObj : (subObj.name || "");
        if (!name) return;
        const image = typeof subObj === "string" ? "" : (subObj.image || "");
        list.push({
          categoryId: cat._id,
          parentCategory: cat.name,
          name,
          image,
          key: `${cat.name}:${name}`,
        });
      });
    });
    return list;
  }, [categories]);

  // Filtering subcategories
  const filteredSubs = useMemo(() => {
    return flattenedSubcategories.filter((sub) => {
      const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterParent === "all"
          ? true
          : sub.parentCategory.toLowerCase() === filterParent.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [flattenedSubcategories, searchQuery, filterParent]);

  // Handlers
  const handleAddSub = async () => {
    if (!newSubName.trim()) return;
    const category = getCategory(newSubParent);
    if (!category?._id) return;

    try {
      const updated = await addSubcategory(category._id, newSubName.trim(), newSubImage);
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setNewSubName("");
      setNewSubImage("");
      setAddModalOpen(false);
      showNotification(`Added "${newSubName}" to ${newSubParent}.`);
    } catch (err) {
      showNotification(err.message || "Failed to add subcategory", "error");
    }
  };

  const handleDeleteSub = async () => {
    if (!subToDelete) return;
    const { parentCategory, name } = subToDelete;
    const category = getCategory(parentCategory);
    if (!category?._id) return;

    try {
      const updated = await deleteSubcategory(category._id, name);
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      showNotification(`Removed "${name}" from ${parentCategory}.`);
      setSubToDelete(null);
    } catch (err) {
      showNotification(err.message || "Failed to remove subcategory", "error");
    }
  };

  const handleImageChange = async (parentCategory, subName, file) => {
    const category = getCategory(parentCategory);
    if (!category?._id) return;

    const key = `${parentCategory}:${subName}`;
    setUploadingSubKey(key);
    const formData = new FormData();
    formData.append("image", file);

    showNotification("Uploading image...", "success");
    try {
      const res = await uploadImage(formData);
      const imageUrl = res.url;
      const updated = await updateSubcategory(category._id, subName, subName, imageUrl);
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      showNotification(`Updated image for ${subName}.`);
    } catch (err) {
      showNotification(err.message || "Failed to upload image", "error");
    } finally {
      setUploadingSubKey(null);
    }
  };

  const handleNewSubImageUpload = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    setUploadingNewImage(true);
    showNotification("Uploading image...", "success");
    try {
      const res = await uploadImage(formData);
      setNewSubImage(res.url);
      showNotification("Image uploaded successfully.");
    } catch (err) {
      showNotification(err.message || "Failed to upload image", "error");
    } finally {
      setUploadingNewImage(false);
    }
  };

  const handleRenameSub = async (parentCategory, oldName, newName) => {
    const category = getCategory(parentCategory);
    if (!category?._id || !newName.trim() || oldName === newName) return;

    try {
      const updated = await updateSubcategory(category._id, oldName, newName.trim());
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      showNotification(`Renamed "${oldName}" to "${newName}".`);
    } catch (err) {
      showNotification(err.message || "Failed to rename subcategory", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
        <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#b89b5e] animate-pulse">Loading Taxonomy...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* Premium Toast Notification */}
      {notification && (
        <div className="fixed bottom-12 right-12 z-[100] px-8 py-5 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all animate-in slide-in-from-right duration-500 flex items-center gap-4 bg-[#2b2622] text-white border-l-4 border-[#b89b5e]">
          <div className="w-2 h-2 bg-[#b89b5e] rounded-full animate-pulse"></div>
          <p className="text-xs font-bold uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 md:gap-10 mb-12 md:mb-20 px-4 sm:px-0">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-4">— Taxonomy —</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-3 md:mb-4">Categories</h1>
          <p className="text-[#6f6a65] text-xs md:text-sm max-w-lg leading-relaxed opacity-60 italic">
            Clothing and Jewellery are the two fixed collections. Create and manage the subcategories within each.
          </p>
        </div>
        <button 
          onClick={() => setAddModalOpen(true)}
          className="bg-[#2b2622] text-white w-full xl:w-auto text-center px-6 py-4 md:px-10 md:py-5 rounded-[20px] md:rounded-[28px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-[#b89b5e] transition-all shadow-[0_20px_40px_rgba(43,38,34,0.15)] hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(184,155,94,0.25)] active:scale-95 group cursor-pointer"
        >
          <span className="flex items-center justify-center xl:justify-start gap-3">
            Add Subcategory <span className="text-lg md:text-xl group-hover:rotate-90 transition-transform inline-block">+</span>
          </span>
        </button>
      </div>

      {/* Modern Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 mb-8 md:mb-10 px-4 sm:px-0">
        <div className="md:col-span-7 relative group">
          <input 
            type="text" 
            placeholder="Search subcategory by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#dcd4cb] rounded-[16px] md:rounded-[24px] px-5 py-4 md:px-8 md:py-5 text-xs md:text-sm font-bold outline-none focus:border-[#b89b5e] focus:shadow-[0_10px_30px_rgba(184,155,94,0.05)] transition-all group-hover:border-[#b89b5e]/40"
          />
          <span className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 opacity-20 text-lg md:text-xl group-hover:opacity-40 transition-opacity italic">Searching</span>
        </div>
        <div className="md:col-span-3">
          <select
            value={filterParent}
            onChange={(e) => setFilterParent(e.target.value)}
            className="w-full h-full bg-white border border-[#dcd4cb] rounded-[16px] md:rounded-[24px] px-5 py-4 md:px-8 md:py-5 text-xs md:text-sm font-bold outline-none focus:border-[#b89b5e] transition-all cursor-pointer text-[#6f6a65]/60 hover:text-[#b89b5e]"
          >
            <option value="all">All Categories</option>
            <option value="clothing">Clothing Only</option>
            <option value="jewellery">Jewellery Only</option>
          </select>
        </div>
        <div className="md:col-span-2 bg-[#e2ddd5] rounded-[16px] md:rounded-[24px] px-4 py-4 md:px-6 md:py-5 flex items-center justify-center border border-[#dcd4cb]">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#2b2622]/40">
            {filteredSubs.length} Items
          </span>
        </div>
      </div>

      {/* Refined Categories Table */}
      <div className="bg-white rounded-[48px] border border-[#dcd4cb] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.03)] mx-4 sm:mx-0 mb-10">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#fcfbf9] z-10">
              <tr className="border-b border-[#f2eee9]">
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Subcategory Details</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Parent Category</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Signature Image</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#fcfbf9]">
              {filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-32 text-center flex-col items-center">
                    <div className="text-8xl mb-8 opacity-10">🔍</div>
                    <p className="text-[#6f6a65] font-bold text-xl tracking-tighter italic">No subcategories found.</p>
                    <p className="text-[#6f6a65]/40 text-xs mt-2 uppercase tracking-widest">Adjust your search criteria or add a new subcategory.</p>
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const isUploading = uploadingSubKey === sub.key;
                  return (
                    <tr key={sub.key} className="hover:bg-[#fcfbf9]/80 transition-all group border-b border-[#f2eee9]">
                      <td className="p-8">
                        <div className="flex items-center gap-6">
                          <div className="relative group/img flex-shrink-0 w-16 h-16 bg-[#f5eee1] rounded-[20px] overflow-hidden border border-[#dcd4cb] flex items-center justify-center">
                            {sub.image ? (
                              <img 
                                src={sub.image} 
                                alt={sub.name}
                                className="w-16 h-16 object-cover transition-all duration-700 group-hover/img:scale-110 flex-shrink-0"
                              />
                            ) : (
                              <span className="text-[9px] text-[#6f6a65]/40 uppercase tracking-widest font-black">No Image</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <input
                              type="text"
                              defaultValue={sub.name}
                              onBlur={(e) => {
                                if (e.target.value.trim() && e.target.value.trim() !== sub.name) {
                                  handleRenameSub(sub.parentCategory, sub.name, e.target.value);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  e.target.blur();
                                }
                              }}
                              className="font-bold text-[#2b2622] tracking-tight text-lg mb-1 bg-transparent border-b border-transparent hover:border-[#b89b5e] focus:border-[#b89b5e] outline-none max-w-[240px] transition-all"
                            />
                            <span className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/40">Click text to edit name</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-8">
                        <span className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-[#b89b5e] bg-[#b89b5e]/10">
                          {sub.parentCategory}
                        </span>
                      </td>
                      <td className="p-8">
                        <label className="bg-transparent text-[#6f6a65]/50 border border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e] hover:bg-[#b89b5e]/5 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all inline-flex items-center gap-2 cursor-pointer">
                          {isUploading ? (
                            <LoadingSpinner color="border-[#b89b5e]" />
                          ) : (
                            <>
                              Upload Image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleImageChange(sub.parentCategory, sub.name, e.target.files[0]);
                                  }
                                }}
                              />
                            </>
                          )}
                        </label>
                      </td>
                      <td className="p-8">
                        <div className="flex items-center gap-8">
                          <button 
                            onClick={() => setSubToEdit({ ...sub, newName: sub.name })}
                            className="text-[#2b2622]/40 hover:text-[#b89b5e] font-black text-[10px] tracking-widest uppercase transition-all flex items-center gap-2 group/edit cursor-pointer border-0 bg-transparent"
                          >
                            <span className="w-0 group-hover/edit:w-2 h-[1px] bg-[#b89b5e] transition-all overflow-hidden"></span>
                            Modify
                          </button>
                          <button 
                            onClick={() => setSubToDelete(sub)}
                            className="text-red-300 hover:text-red-500 font-black text-[10px] tracking-widest uppercase transition-all cursor-pointer group/del border-0 bg-transparent"
                          >
                            Delete
                            <span className="opacity-0 group-hover/del:opacity-100 transition-opacity ml-2 italic">×</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subcategory Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-[#2b2622]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-[#fdfaf5] w-full max-w-md rounded-[24px] border border-[#e8e4de] p-6 shadow-[0_16px_40px_rgba(43,38,34,0.12)] relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute top-6 right-6 text-[#6f6a65]/40 hover:text-[#2b2622] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex flex-col items-start mt-4 space-y-4">
              <div>
                <span className="text-[#b89b5e] font-black tracking-[0.25em] uppercase text-[8.5px] block mb-1.5">
                  Taxonomy Add
                </span>
                <h3 className="text-xl font-serif text-[#2b2622]">Add New Subcategory</h3>
              </div>

              {/* Parent Category Select */}
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/60 block mb-2">Parent Category</label>
                <select
                  value={newSubParent}
                  onChange={(e) => setNewSubParent(e.target.value)}
                  className="w-full bg-white border border-[#dcd4cb] rounded-[16px] px-5 py-4 text-xs font-bold outline-none focus:border-[#b89b5e]"
                >
                  <option value="Clothing">Clothing</option>
                  <option value="Jewellery">Jewellery</option>
                </select>
              </div>

              {/* Name Input */}
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/60 block mb-2">Subcategory Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sarees, Earrings"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full bg-white border border-[#dcd4cb] rounded-[16px] px-5 py-4 text-xs font-bold outline-none focus:border-[#b89b5e]"
                />
              </div>

              {/* Image Upload */}
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/60 block mb-2">Signature Image (Optional)</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#f5eee1] rounded-[20px] overflow-hidden border border-[#dcd4cb] flex items-center justify-center flex-shrink-0">
                    {newSubImage ? (
                      <img src={newSubImage} alt="Preview" className="w-16 h-16 object-cover" />
                    ) : (
                      <span className="text-[9px] text-[#6f6a65]/40 uppercase tracking-widest font-black">No Image</span>
                    )}
                  </div>
                  <label className="bg-transparent text-[#6f6a65]/50 border border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e] hover:bg-[#b89b5e]/5 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer">
                    {uploadingNewImage ? <LoadingSpinner color="border-[#b89b5e]" /> : "Choose Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleNewSubImageUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 w-full pt-4">
                <button
                  type="button"
                  onClick={handleAddSub}
                  disabled={!newSubName.trim() || uploadingNewImage}
                  className="w-full bg-[#2b2622] hover:bg-[#b89b5e] disabled:opacity-40 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center active:scale-95"
                >
                  Create Subcategory
                </button>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-6 py-3.5 rounded-xl border border-[#e8e4de] text-[#6f6a65] text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {subToDelete && (
        <div className="fixed inset-0 bg-[#2b2622]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-[#fdfaf5] w-full max-w-md rounded-[24px] border border-[#e8e4de] p-6 shadow-[0_16px_40px_rgba(43,38,34,0.12)] relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            <button
              onClick={() => setSubToDelete(null)}
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
                <h3 className="text-xl font-serif text-[#2b2622]">Delete Subcategory?</h3>
                <p className="text-[11px] text-[#6f6a65] font-light mt-1.5 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-[#2b2622]">"{subToDelete.name}"</span> from <span className="font-bold text-[#2b2622]">{subToDelete.parentCategory}</span>? This action will permanently remove the subcategory and clear it from all products.
                </p>
              </div>
              
              <div className="flex gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={handleDeleteSub}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center active:scale-95"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setSubToDelete(null)}
                  className="px-6 py-3.5 rounded-xl border border-[#e8e4de] text-[#6f6a65] text-[9px] font-black uppercase tracking-widest hover:bg-white transition-all cursor-pointer active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modify Subcategory Modal */}
      {subToEdit && (
        <div className="fixed inset-0 bg-[#2b2622]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
          <div className="bg-[#fdfaf5] w-full max-w-md rounded-[24px] border border-[#e8e4de] p-6 shadow-[0_16px_40px_rgba(43,38,34,0.12)] relative animate-in zoom-in-95 duration-200 overflow-hidden">
            <button
              onClick={() => setSubToEdit(null)}
              className="absolute top-6 right-6 text-[#6f6a65]/40 hover:text-[#2b2622] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex flex-col items-start mt-4 space-y-4">
              <div>
                <span className="text-[#b89b5e] font-black tracking-[0.25em] uppercase text-[8.5px] block mb-1.5">
                  Taxonomy Modify
                </span>
                <h3 className="text-xl font-serif text-[#2b2622]">Modify Subcategory</h3>
              </div>

              {/* Parent Category Display */}
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/60 block mb-2">Parent Category</label>
                <input
                  type="text"
                  disabled
                  value={subToEdit.parentCategory}
                  className="w-full bg-[#f2eee9] border border-[#dcd4cb] rounded-[16px] px-5 py-4 text-xs font-bold outline-none text-[#6f6a65]/60"
                />
              </div>

              {/* Name Input */}
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/60 block mb-2">Subcategory Name</label>
                <input
                  type="text"
                  placeholder="Subcategory Name"
                  value={subToEdit.newName}
                  onChange={(e) => setSubToEdit(prev => ({ ...prev, newName: e.target.value }))}
                  className="w-full bg-white border border-[#dcd4cb] rounded-[16px] px-5 py-4 text-xs font-bold outline-none focus:border-[#b89b5e]"
                />
              </div>

              {/* Image Upload */}
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-widest text-[#6f6a65]/60 block mb-2">Signature Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#f5eee1] rounded-[20px] overflow-hidden border border-[#dcd4cb] flex items-center justify-center flex-shrink-0">
                    {subToEdit.image ? (
                      <img src={subToEdit.image} alt="Preview" className="w-16 h-16 object-cover" />
                    ) : (
                      <span className="text-[9px] text-[#6f6a65]/40 uppercase tracking-widest font-black">No Image</span>
                    )}
                  </div>
                  <label className="bg-transparent text-[#6f6a65]/50 border border-[#dcd4cb] hover:border-[#b89b5e] hover:text-[#b89b5e] hover:bg-[#b89b5e]/5 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer">
                    {uploadingEditImage ? <LoadingSpinner color="border-[#b89b5e]" /> : "Change Image"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        if (e.target.files?.[0]) {
                          const formData = new FormData();
                          formData.append("image", e.target.files[0]);
                          setUploadingEditImage(true);
                          showNotification("Uploading image...", "success");
                          try {
                            const res = await uploadImage(formData);
                            setSubToEdit(prev => ({ ...prev, image: res.url }));
                            showNotification("Image uploaded successfully.");
                          } catch (err) {
                            showNotification(err.message || "Failed to upload image", "error");
                          } finally {
                            setUploadingEditImage(false);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 w-full pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    if (!subToEdit.newName.trim()) return;
                    const category = getCategory(subToEdit.parentCategory);
                    if (!category?._id) return;
                    try {
                      const updated = await updateSubcategory(category._id, subToEdit.name, subToEdit.newName.trim(), subToEdit.image);
                      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
                      showNotification(`Successfully updated subcategory "${subToEdit.newName}".`);
                      setSubToEdit(null);
                    } catch (err) {
                      showNotification(err.message || "Failed to update subcategory", "error");
                    }
                  }}
                  disabled={!subToEdit.newName.trim() || uploadingEditImage}
                  className="w-full bg-[#2b2622] hover:bg-[#b89b5e] disabled:opacity-40 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 shadow-md cursor-pointer flex items-center justify-center active:scale-95"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setSubToEdit(null)}
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
