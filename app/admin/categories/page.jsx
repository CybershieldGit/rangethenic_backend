"use client";

import { useState, useEffect } from "react";
import {
  fetchCategories,
  createCategory,
  addSubcategory,
  deleteSubcategory,
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

  // Per-category input + busy state, keyed by category name
  const [newSubInputs, setNewSubInputs] = useState({});
  const [addingFor, setAddingFor] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load categories and ensure the two fixed main categories exist
  useEffect(() => {
    const init = async () => {
      try {
        let data = await fetchCategories();
        const byName = new Map(data.map((c) => [c.name.toLowerCase(), c]));

        for (const main of MAIN_CATEGORIES) {
          if (!byName.has(main.name.toLowerCase())) {
            try {
              const created = await createCategory(main.name, []);
              data = [...data, created];
            } catch (err) {
              // Ignore "already exists" races; log anything else
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
    init();
  }, []);

  const getCategory = (name) =>
    categories.find((c) => c.name.toLowerCase() === name.toLowerCase());

  const handleAddSub = async (mainName) => {
    const category = getCategory(mainName);
    const value = (newSubInputs[mainName] || "").trim();
    if (!category?._id || !value) return;

    setAddingFor(mainName);
    try {
      const updated = await addSubcategory(category._id, value);
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      setNewSubInputs((prev) => ({ ...prev, [mainName]: "" }));
      showNotification(`Added "${value}" to ${mainName}.`);
    } catch (err) {
      showNotification(err.message || "Failed to add subcategory", "error");
    } finally {
      setAddingFor(null);
    }
  };

  const handleDeleteSub = async (mainName, sub) => {
    const category = getCategory(mainName);
    if (!category?._id) return;

    const key = `${mainName}:${sub}`;
    setDeletingKey(key);
    try {
      const updated = await deleteSubcategory(category._id, sub);
      setCategories((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
      showNotification(`Removed "${sub}" from ${mainName}.`);
    } catch (err) {
      showNotification(err.message || "Failed to remove subcategory", "error");
    } finally {
      setDeletingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#b89b5e] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto relative">
      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-12 right-12 z-[100] px-8 py-5 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all flex items-center gap-4 ${
          notification.type === "success" ? "bg-[#2b2622] text-white border-l-4 border-[#b89b5e]" : "bg-red-600 text-white"
        }`}>
          <div className="w-2 h-2 bg-[#b89b5e] rounded-full animate-pulse"></div>
          <p className="text-xs font-bold uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="mb-12 md:mb-16 px-4 sm:px-0">
        <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-4">— Taxonomy —</span>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-3 md:mb-4">Categories</h1>
        <p className="text-[#6f6a65] text-xs md:text-sm max-w-lg leading-relaxed opacity-60 italic">
          Clothing and Jewellery are the two fixed collections. Create and manage the subcategories within each.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 sm:px-0">
        {MAIN_CATEGORIES.map((main) => {
          const category = getCategory(main.name);
          const subs = category?.subcategories || [];

          return (
            <div key={main.name} className="bg-white rounded-2xl sm:rounded-[28px] border border-[#e8e1d9] p-4 sm:p-6 md:p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#2b2622]">{main.name}</h3>
                  <p className="text-[9px] text-[#6f6a65]/60 italic mt-1">{main.description}</p>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#b89b5e] bg-[#b89b5e]/10 px-3 py-1.5 rounded-full">
                  {subs.length} sub
                </span>
              </div>

              {/* Subcategory chips */}
              <div className="flex flex-wrap gap-2 mb-6 min-h-[2.5rem]">
                {subs.length === 0 ? (
                  <p className="text-xs text-[#6f6a65]/40 italic">No subcategories yet. Add your first one below.</p>
                ) : (
                  subs.map((sub) => {
                    const key = `${main.name}:${sub}`;
                    const isDeleting = deletingKey === key;
                    return (
                      <span key={sub} className="group inline-flex items-center gap-2 bg-[#fcfbf9] border border-[#e8e1d9] rounded-xl pl-3.5 pr-2 py-2 text-sm font-semibold text-[#2b2622]">
                        {sub}
                        <button type="button" disabled={isDeleting}
                          onClick={() => handleDeleteSub(main.name, sub)}
                          className="w-5 h-5 rounded-lg flex items-center justify-center text-[#6f6a65]/50 hover:bg-red-500 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                          title={`Remove ${sub}`}
                        >
                          {isDeleting ? (
                            <LoadingSpinner size="w-3 h-3" color="border-[#b89b5e]" />
                          ) : (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </button>
                      </span>
                    );
                  })
                )}
              </div>

              {/* Add subcategory */}
              <div className="flex gap-2">
                <input type="text"
                  value={newSubInputs[main.name] || ""}
                  onChange={(e) => setNewSubInputs((prev) => ({ ...prev, [main.name]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSub(main.name); } }}
                  placeholder={`New ${main.name.toLowerCase()} subcategory...`}
                  className="flex-1 p-3.5 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold placeholder:text-[#6f6a65]/30 placeholder:italic"
                />
                <button type="button"
                  disabled={addingFor === main.name || !(newSubInputs[main.name] || "").trim()}
                  onClick={() => handleAddSub(main.name)}
                  className="px-5 py-3.5 rounded-2xl bg-[#2b2622] text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#b89b5e] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addingFor === main.name ? <LoadingSpinner size="w-3 h-3" /> : "Add"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
