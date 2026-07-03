"use client";

import { useEffect, useState } from "react";
import { fetchAttributes, createAttributeAPI, deleteAttributeAPI } from "@/utils/api";
import { HexColorPicker } from "react-colorful";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

const getCssColorHex = (name) => {
  if (typeof document === "undefined") return null;
  const temp = document.createElement("div");
  temp.style.color = "transparent";
  temp.style.color = name.trim().toLowerCase();
  
  if (temp.style.color === "transparent" || temp.style.color === "") {
    return null;
  }
  
  document.body.appendChild(temp);
  const style = window.getComputedStyle(temp).color;
  document.body.removeChild(temp);
  
  if (style === "transparent" || style === "rgba(0, 0, 0, 0)") {
    return null;
  }

  const match = style.match(/\d+/g);
  if (!match) return null;
  const [r, g, b] = match.map(Number);
  
  const toHexVal = (c) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHexVal(r)}${toHexVal(g)}${toHexVal(b)}`;
};

export default function JewelColorsPage() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#b89b5e");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAttributes = async () => {
    try {
      setLoading(true);
      const data = await fetchAttributes("jewel_color");
      setAttributes(data);
    } catch (err) {
      console.error(err);
      showNotification(err.message || "Failed to load jewel colors", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;
    const cleanHex = colorHex.replace("#", "");
    if (cleanHex.length !== 6) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://www.thecolorapi.com/id?hex=${cleanHex}`);
        const data = await res.json();
        if (data && data.name && data.name.value) {
          setColorName(data.name.value);
        }
      } catch (err) {
        console.error("Failed to fetch color name:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [colorHex, isModalOpen]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const name = colorName.trim();
    if (!name) return;

    const value = `${name}|${colorHex}`;
    setAdding(true);
    try {
      const created = await createAttributeAPI("jewel_color", value);
      setAttributes((prev) => [...prev, created].sort((a, b) => a.value.localeCompare(b.value)));
      setColorName("");
      setColorHex("#b89b5e");
      setIsModalOpen(false);
      showNotification(`Jewel Color "${name}" successfully created.`);
    } catch (err) {
      showNotification(err.message || "Failed to add jewel color", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, val) => {
    setDeletingId(id);
    try {
      await deleteAttributeAPI(id);
      setAttributes((prev) => prev.filter((item) => item._id !== id));
      const displayVal = val.includes("|") ? val.split("|")[0] : val;
      showNotification(`Jewel Color "${displayVal}" removed.`);
    } catch (err) {
      showNotification(err.message || "Failed to delete jewel color", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
        <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#b89b5e] animate-pulse">Loading Colors...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto relative">
      {/* Toast */}
      {notification && (
        <div className={`fixed bottom-12 right-12 z-[100] px-8 py-5 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all animate-in slide-in-from-right duration-500 flex items-center gap-4 ${
          notification.type === "success" ? "bg-[#2b2622] text-white border-l-4 border-[#b89b5e]" : "bg-red-600 text-white"
        }`}>
          <div className="w-2 h-2 bg-[#b89b5e] rounded-full animate-pulse"></div>
          <p className="text-xs font-bold uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12 md:mb-16 px-4 sm:px-0">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-3">— Jewel Color Settings —</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#2b2622] leading-none mb-2">Jewel Color</h1>
          <p className="text-[#6f6a65] text-xs max-w-md leading-relaxed opacity-60 italic">Define gemstone and bead colors for your jewellery.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 bg-[#2b2622] hover:bg-[#b89b5e] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
        >
          Add Jewel Color +
        </button>
      </div>

      {/* Main List */}
      <div className="px-4 sm:px-0">
        <div className="bg-white rounded-[32px] border border-[#e8e1d9] overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#f2eee9]">
                  <th className="p-6 font-black text-[#6f6a65]/40 text-[9px] uppercase tracking-[0.3em]">Available Jewel Colors</th>
                  <th className="p-6 font-black text-[#6f6a65]/40 text-[9px] uppercase tracking-[0.3em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#fcfbf9]">
                {attributes.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="p-16 text-center text-[#6f6a65]/40 text-xs italic">
                      No jewel colors available.
                    </td>
                  </tr>
                ) : (
                  attributes.map((attr) => {
                    const hasPipe = attr.value.includes("|");
                    const name = hasPipe ? attr.value.split("|")[0] : attr.value;
                    const hex = hasPipe ? attr.value.split("|")[1] : "#CCCCCC";
                    return (
                      <tr key={attr._id} className="hover:bg-[#fcfbf9]/60 transition-all border-b border-[#f2eee9]">
                        <td className="p-6 flex items-center gap-3">
                          <div 
                            className="w-5 h-5 rounded-full border border-stone-200 shadow-sm shrink-0" 
                            style={{ backgroundColor: hex }}
                          />
                          <span className="font-bold text-[#2b2622] tracking-wide uppercase text-sm">{name}</span>
                          <span className="text-[10px] text-[#6f6a65]/40 font-mono">{hex}</span>
                        </td>
                        <td className="p-6 text-right">
                          <button 
                            onClick={() => handleDelete(attr._id, attr.value)}
                            disabled={deletingId === attr._id}
                            className="text-red-400 hover:text-red-600 font-black text-[9px] tracking-widest uppercase transition-all cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === attr._id ? <LoadingSpinner color="border-red-500" /> : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2b2622]/40 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all">
          <div className="bg-white w-full max-w-md rounded-[32px] border border-[#e8e1d9] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.15)] relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsModalOpen(false);
                setColorName("");
                setColorHex("#b89b5e");
              }}
              className="absolute top-6 right-6 text-[#6f6a65]/40 hover:text-[#2b2622] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-lg font-black uppercase tracking-widest text-[#2b2622] mb-6">Add Jewel Color</h3>
            <form onSubmit={handleAdd} className="space-y-6">
              <div>
                <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2.5 ml-1">Color Name</label>
                <input 
                  type="text" 
                  value={colorName} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setColorName(val);
                    const resolvedHex = getCssColorHex(val);
                    if (resolvedHex) {
                      setColorHex(resolvedHex);
                    }
                  }} 
                  required 
                  placeholder="e.g. Ruby Red, Emerald Green, Turquoise" 
                  className="w-full p-4 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold"
                />
              </div>

              <div className="flex flex-col items-center gap-4 bg-[#fcfbf9] p-6 rounded-2xl border border-[#e8e1d9]">
                <label className="block self-start text-[9px] uppercase font-black tracking-widest text-[#6f6a65] ml-1">Select Hue</label>
                <HexColorPicker color={colorHex} onChange={setColorHex} className="!w-full max-w-[200px]" />
                <div className="flex items-center gap-3 mt-2 w-full">
                  <div className="w-10 h-10 rounded-xl border border-stone-200 shadow-sm shrink-0" style={{ backgroundColor: colorHex }} />
                  <input 
                    type="text" 
                    value={colorHex} 
                    onChange={(e) => setColorHex(e.target.value)} 
                    className="w-full p-3 rounded-xl border border-[#e8e1d9] bg-white outline-none font-mono text-xs text-[#2b2622] font-bold"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={adding} 
                className="w-full py-4 rounded-xl text-white bg-[#2b2622] hover:bg-[#b89b5e] font-black uppercase tracking-[0.2em] text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {adding ? <LoadingSpinner /> : "Add Jewel Color"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
