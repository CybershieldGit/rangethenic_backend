"use client";

import { useState, useEffect } from "react";
import {
  fetchGalleryVideos,
  createGalleryVideo,
  deleteGalleryVideo,
  uploadVideo,
} from "@/utils/api";
import { Trash2, Film, UploadCloud, Loader2, CheckCircle2, AlertCircle, Copy, Check } from "lucide-react";

const LoadingSpinner = ({ size = "w-4 h-4", color = "border-[#b89b5e]" }) => (
  <div className={`${size} border-2 ${color} border-t-transparent rounded-full animate-spin`}></div>
);

export default function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Form states
  const [title, setTitle] = useState("");
  const [uploadError, setUploadError] = useState("");

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await fetchGalleryVideos();
      setVideos(data || []);
    } catch (err) {
      showNotification(err.message || "Failed to load videos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("Video file exceeds the 50MB limit.");
      e.target.value = "";
      return;
    }

    setUploadError("");
    setUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("video", file);

      // 1. Upload to Cloudinary via backend proxy
      const res = await uploadVideo(uploadData);

      // 2. Save the video entry in MongoDB
      await createGalleryVideo({
        url: res.url,
        publicId: res.public_id || "",
        title: title || file.name.split(".")[0],
      });

      showNotification("Gallery video uploaded successfully.");
      setTitle("");
      setIsModalOpen(false);
      loadVideos();
    } catch (err) {
      setUploadError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this gallery video?")) return;

    setDeletingId(id);
    try {
      await deleteGalleryVideo(id);
      showNotification("Gallery video deleted successfully.");
      setVideos((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      showNotification(err.message || "Failed to delete video", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyLink = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-6 bg-[#FFFDF9]">
        <LoadingSpinner size="w-12 h-12" color="border-[#b89b5e]" />
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#b89b5e] animate-pulse">Illuminating Chamber...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto relative px-4 sm:px-0">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-12 right-12 z-[100] px-8 py-5 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all animate-in slide-in-from-right duration-500 flex items-center gap-4 ${notification.type === "success" ? "bg-[#2b2622] text-white border-l-4 border-[#b89b5e]" : "bg-red-600 text-white"
          }`}>
          <div className="w-2 h-2 bg-[#b89b5e] rounded-full animate-pulse"></div>
          <p className="text-xs font-bold uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      {/* Header section matching Coupons/Products formatting */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 md:gap-10 mb-12 md:mb-20">
        <div>
          <span className="text-[#b89b5e] font-black tracking-[0.5em] uppercase text-[9px] md:text-[10px] block mb-2 md:mb-4">— Media Chamber —</span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#2b2622] leading-none mb-3 md:mb-4">The House of Elegance</h1>
          <p className="text-[#6f6a65] text-xs md:text-sm max-w-lg leading-relaxed opacity-60 italic">Manage auto-scrolling video reels for the homepage gallery track. High-resolution mp4 formats render best.</p>
        </div>
        <button
          onClick={() => {
            setIsModalOpen(true);
            setUploadError("");
          }}
          className="bg-[#2b2622] text-white w-full xl:w-auto text-center px-6 py-4 md:px-10 md:py-5 rounded-[20px] md:rounded-[28px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] hover:bg-[#b89b5e] transition-all shadow-[0_20px_40px_rgba(43,38,34,0.15)] hover:-translate-y-2 hover:shadow-[0_25px_50px_rgba(184,155,94,0.25)] active:scale-95 group cursor-pointer"
        >
          <span className="flex items-center justify-center xl:justify-start gap-3">
            Upload Video <span className="text-lg md:text-xl group-hover:rotate-90 transition-transform inline-block">+</span>
          </span>
        </button>
      </div>

      {/* Videos List Table */}
      <div className="bg-white rounded-[48px] border border-[#dcd4cb] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.03)] mb-10">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fcfbf9] border-b border-[#f2eee9]">
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em] w-48">Video Preview</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Video Info</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em]">Cloudinary URL</th>
                <th className="p-10 font-black text-[#6f6a65]/40 text-[10px] uppercase tracking-[0.3em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#fcfbf9]">
              {videos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-32 text-center">
                    <div className="text-8xl mb-8 opacity-10">🎬</div>
                    <p className="text-[#6f6a65] font-bold text-xl tracking-tighter italic">No gallery videos inhabit these halls.</p>
                    <p className="text-[#6f6a65]/40 text-xs mt-2 uppercase tracking-widest">Click upload video to start displaying dynamic media on your storefront.</p>
                  </td>
                </tr>
              ) : (
                videos.map((video) => (
                  <tr key={video._id} className="hover:bg-[#fcfbf9]/60 transition-colors">
                    <td className="p-10">
                      <div className="w-32 aspect-[16/10] bg-black rounded-xl overflow-hidden border border-[#dcd4cb] shadow-sm relative group">
                        <video
                          src={video.url}
                          muted
                          playsInline
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="p-10">
                      <h4 className="font-bold text-sm text-[#2b2622]">{video.title || "Untitled Video"}</h4>
                      <p className="text-[#6f6a65]/50 text-[10px] uppercase tracking-widest font-bold mt-1">
                        Uploaded {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="p-10">
                      <div className="flex items-center gap-2 max-w-xs md:max-w-md">
                        <input
                          type="text"
                          readOnly
                          value={video.url}
                          className="text-xs bg-[#fcfbf9] border border-[#dcd4cb] px-3 py-2 rounded-lg font-mono text-[#6f6a65] w-full truncate focus:outline-none"
                        />
                        <button
                          onClick={() => handleCopyLink(video.url, video._id)}
                          className="p-2 border border-[#dcd4cb] hover:bg-[#b89b5e] hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedId === video._id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-10 text-right">
                      <button
                        onClick={() => handleDelete(video._id)}
                        disabled={deletingId === video._id}
                        className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === video._id ? (
                          <span className="flex items-center gap-1.5 justify-center">
                            Deleting <LoadingSpinner size="w-3 h-3" color="border-red-600" />
                          </span>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Upload Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#2b2622]/60 backdrop-blur-md z-[110] flex justify-center items-center p-4">
          <div className="bg-white rounded-[40px] border border-[#dcd4cb] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="px-10 pt-10 pb-6 border-b border-[#f2eee9] flex justify-between items-center bg-[#fcfbf9]">
              <div>
                <span className="text-[#b89b5e] font-black tracking-[0.4em] uppercase text-[9px] block mb-1">Offerings</span>
                <h3 className="text-2xl font-bold tracking-tight text-[#2b2622]">Upload Video</h3>
              </div>
              <button
                onClick={() => {
                  if (!uploading) setIsModalOpen(false);
                }}
                className="w-10 h-10 rounded-full border border-[#dcd4cb] flex items-center justify-center text-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
                disabled={uploading}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-10 space-y-6">
              {uploadError && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold font-serif">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#6f6a65]/60 mb-2">Video Title (Optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Signature Saree Walkthrough"
                  disabled={uploading}
                  className="w-full px-5 py-4 border border-[#dcd4cb] rounded-2xl text-xs font-bold outline-none bg-[#fcfbf9] focus:border-[#b89b5e] focus:bg-white transition-all disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#6f6a65]/60 mb-2">Select Video File</label>
                <div className="relative border-2 border-dashed border-[#dcd4cb] hover:border-[#b89b5e]/60 rounded-3xl p-8 text-center cursor-pointer transition-all bg-[#fcfbf9] hover:bg-[#fcfbf9]/30">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={uploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center justify-center space-y-3 py-4">
                      <Loader2 className="w-8 h-8 text-[#b89b5e] animate-spin" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#2b2622]">Buffering to Cloudinary...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-3 py-4">
                      <UploadCloud className="w-10 h-10 text-[#b89b5e]" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-[#2b2622]">Choose video file</span>
                      <span className="text-[9px] text-[#6f6a65]/50 font-bold uppercase tracking-wider">MP4, WebM or Ogg up to 50MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
