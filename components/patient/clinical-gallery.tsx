"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Camera, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

export interface GalleryImageItem {
  id: string;
  imageUrl: string;
  caption?: string | null;
  displayOrder?: number;
}

interface ClinicalGalleryProps {
  images: GalleryImageItem[];
  labName: string;
}

export function ClinicalGallery({ images, labName }: ClinicalGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const activeImage = selectedIndex !== null ? images[selectedIndex] : null;

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handlePrev = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! > 0 ? prev! - 1 : images.length - 1));
  }, [selectedIndex, images.length]);

  const handleNext = useCallback(() => {
    if (selectedIndex === null) return;
    setSelectedIndex((prev) => (prev! < images.length - 1 ? prev! + 1 : 0));
  }, [selectedIndex, images.length]);

  // Keyboard navigation & Esc to close
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, handleClose, handlePrev, handleNext]);

  // Prevent background scroll when lightbox is open
  useEffect(() => {
    if (selectedIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Clinical Facility & Laboratory Gallery"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-sky-600" />
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Laboratory & Clinical Facility
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {images.length} {images.length === 1 ? "Photograph" : "Photographs"}
        </span>
      </div>

      <p className="mb-5 text-xs text-slate-500 max-w-2xl">
        Take a virtual tour of {labName}&apos;s clinical testing environment, automated analyzers, and patient collection facilities.
      </p>

      {/* Grid of gallery images */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setSelectedIndex(idx)}
            className="group relative aspect-4/3 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
            aria-label={`View photo ${idx + 1} of ${images.length}: ${img.caption || "Facility image"}`}
          >
            <img
              src={img.imageUrl}
              alt={img.caption || `${labName} facility image ${idx + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity duration-200 group-hover:opacity-100 flex items-center justify-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md">
                <Maximize2 className="h-4 w-4" />
              </div>
            </div>

            {img.caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-white">
                <p className="text-[11px] font-medium leading-tight line-clamp-1">
                  {img.caption}
                </p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Accessible Lightbox Modal */}
      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xs p-4"
          onClick={handleClose}
        >
          <div
            className="relative max-h-full max-w-5xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close photo preview (Escape)"
              className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition focus:outline-none focus:ring-2 focus:ring-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous photo (Left arrow)"
                  className="absolute -left-4 sm:-left-12 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition focus:outline-none focus:ring-2 focus:ring-white z-10"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next photo (Right arrow)"
                  className="absolute -right-4 sm:-right-12 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition focus:outline-none focus:ring-2 focus:ring-white z-10"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Main Preview Image */}
            <div className="max-h-[75vh] overflow-hidden rounded-2xl bg-black">
              <img
                src={activeImage.imageUrl}
                alt={activeImage.caption || `${labName} facility image`}
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>

            {/* Caption & Counter */}
            <div className="mt-3 flex w-full items-center justify-between px-2 text-white">
              <p className="text-xs sm:text-sm font-medium text-slate-200 max-w-lg">
                {activeImage.caption || `${labName} Clinical Facility`}
              </p>
              <span className="text-xs font-mono text-slate-400">
                {selectedIndex! + 1} / {images.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
