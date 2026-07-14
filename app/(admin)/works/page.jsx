"use client";

import { useEffect, useState } from "react";
import { fetchAttributes, createAttributeAPI, deleteAttributeAPI } from "@/utils/api";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-white" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

export default function WorksPage() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newValue, setNewValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAttributes = attributes.filter((attr) =>
    attr.value.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadAttributes = async () => {
    try {
      setLoading(true);
      const data = await fetchAttributes("work");
      setAttributes(data);
    } catch (err) {
      console.error(err);
      showNotification(err.message || "Failed to load works", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttributes();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const val = newValue.trim();
    if (!val) return;

    setAdding(true);
    try {
      const created = await createAttributeAPI("work", val);
      setAttributes((prev) => [...prev, created].sort((a, b) => a.value.localeCompare(b.value)));
      setNewValue("");
      setIsModalOpen(false);
      showNotification(`Work pattern "${val}" successfully created.`);
    } catch (err) {
      showNotification(err.message || "Failed to add work", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, val) => {
    setDeletingId(id);
    try {
      await deleteAttributeAPI(id);
      setAttributes((prev) => prev.filter((item) => item._id !== id));
      showNotification(`Work pattern "${val}" removed.`);
    } catch (err) {
      showNotification(err.message || "Failed to delete work", "error");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6">
        <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#b89b5e] animate-pulse">Loading Works...</p>
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
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-3">— Work Settings —</span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#2b2622] leading-none mb-2">Work Filter</h1>
          <p className="text-[#6f6a65] text-xs max-w-md leading-relaxed opacity-60 italic">Define valid embroidery, prints, or craft works for products.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 bg-[#2b2622] hover:bg-[#b89b5e] text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
        >
          Add Work +
        </button>
      </div>

      {/* Modern Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 mb-8 md:mb-10 px-4 sm:px-0">
        <div className="md:col-span-9 relative group">
          <input 
            type="text" 
            placeholder="Search work by name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#dcd4cb] rounded-[16px] md:rounded-[24px] px-5 py-4 md:px-8 md:py-5 text-xs md:text-sm font-bold outline-none focus:border-[#b89b5e] focus:shadow-[0_10px_30px_rgba(184,155,94,0.05)] transition-all group-hover:border-[#b89b5e]/40"
          />
          <span className="absolute right-5 md:right-8 top-1/2 -translate-y-1/2 opacity-20 text-lg md:text-xl group-hover:opacity-40 transition-opacity italic">Searching</span>
        </div>
        <div className="md:col-span-3 bg-[#e2ddd5] rounded-[16px] md:rounded-[24px] px-4 py-4 md:px-6 md:py-5 flex items-center justify-center border border-[#dcd4cb]">
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#2b2622]/40">
            {filteredAttributes.length} Items
          </span>
        </div>
      </div>

      {/* Main List */}
      <div className="px-4 sm:px-0">
        <div className="bg-white rounded-[32px] border border-[#e8e1d9] overflow-hidden shadow-[0_15px_50px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#f2eee9]">
                  <th className="p-6 font-black text-[#6f6a65]/40 text-[9px] uppercase tracking-[0.3em]">Available Works</th>
                  <th className="p-6 font-black text-[#6f6a65]/40 text-[9px] uppercase tracking-[0.3em] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#fcfbf9]">
                {filteredAttributes.length === 0 ? (
                  <tr>
                    <td colSpan="2" className="p-16 text-center text-[#6f6a65]/40 text-xs italic">
                      No matching works available.
                    </td>
                  </tr>
                ) : (
                  filteredAttributes.map((attr) => (
                    <tr key={attr._id} className="hover:bg-[#fcfbf9]/60 transition-all border-b border-[#f2eee9]">
                      <td className="p-6">
                        <span className="font-bold text-[#2b2622] tracking-wide uppercase text-sm">{attr.value}</span>
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
                  ))
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
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-[#6f6a65]/40 hover:text-[#2b2622] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <h3 className="text-lg font-black uppercase tracking-widest text-[#2b2622] mb-6">Add Work</h3>
            <form onSubmit={handleAdd} className="space-y-6">
              <div>
                <label className="block text-[9px] uppercase font-black tracking-widest text-[#6f6a65] mb-2.5 ml-1">Work Type</label>
                <input 
                  type="text" 
                  value={newValue} 
                  onChange={(e) => setNewValue(e.target.value)} 
                  required 
                  placeholder="e.g. Embroidery, Zari, Printed" 
                  className="w-full p-4 rounded-2xl border border-[#e8e1d9] bg-[#fcfbf9] focus:ring-2 focus:ring-[#b89b5e]/20 focus:border-[#b89b5e] outline-none text-sm transition-all text-[#2b2622] font-semibold"
                />
              </div>
              <button 
                type="submit" 
                disabled={adding} 
                className="w-full py-4 rounded-xl text-white bg-[#2b2622] hover:bg-[#b89b5e] font-black uppercase tracking-[0.2em] text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {adding ? <LoadingSpinner /> : "Add Work"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
