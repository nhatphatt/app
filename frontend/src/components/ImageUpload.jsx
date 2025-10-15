import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ImageUpload Component
 * Reusable image upload component with preview
 *
 * @param {string} value - Current image URL
 * @param {function} onChange - Callback when image changes (file or URL)
 * @param {string} className - Additional CSS classes
 * @param {string} aspectRatio - Aspect ratio class (e.g., "aspect-video", "aspect-square")
 * @param {string} placeholder - Placeholder text
 * @param {string} objectFit - CSS object-fit value (cover, contain, fill, etc.)
 */
const ImageUpload = ({
  value,
  onChange,
  className,
  aspectRatio = "aspect-video",
  placeholder = "Click to upload image",
  objectFit = "cover",
}) => {
  const [preview, setPreview] = useState(value || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onChange?.(reader.result, file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onChange?.(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden",
          aspectRatio,
          isDragging
            ? "border-emerald-500 bg-emerald-50"
            : "border-gray-300 hover:border-emerald-400 bg-gray-50 hover:bg-gray-100",
        )}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className={`w-full h-full object-${objectFit}`}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Change
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <div
              className={cn(
                "mb-2 rounded-full p-3 transition-colors",
                isDragging ? "bg-emerald-100" : "bg-gray-200",
              )}
            >
              <ImageIcon
                className={cn(
                  "h-6 w-6 transition-colors",
                  isDragging ? "text-emerald-600" : "text-gray-400",
                )}
              />
            </div>
            <p className="text-xs font-medium text-gray-700 mb-1">
              {isDragging ? "Drop image here" : placeholder}
            </p>
            <p className="text-[10px] text-gray-500">
              or drag and drop (PNG, JPG, GIF)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;
