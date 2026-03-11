import { useState, useId } from "react"; // 👈 1. Import useId

import type { Control } from "react-hook-form";
import { Controller } from "react-hook-form";
import { toast } from 'react-toastify';

import { compressImage, toBase64 } from "@/utils/helpers";

interface ImagePostProps {
  control: Control<any>;
  name: string;
  variant?: 'profile' | 'product';
}

export const ImagePost = ({ control, name, variant = 'product' }: ImagePostProps) => {
  const [loading, setLoading] = useState(false);
  const uniqueId = useId();

  const containerClass = variant === 'profile'
    ? "w-37.5 h-37.5 rounded-full"
    : "w-37.5 h-37.5 rounded-[5px]";

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const showPreview = !!field.value;

        return (
          <div className="flex flex-col items-center gap-3">
            <div className={`relative mx-auto ${containerClass} border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0`}>

              {loading ? (
                <div className="flex flex-col items-center text-gray-400 text-xs animate-pulse p-4 text-center">
                  <i className="ri-loader-4-line text-2xl animate-spin mb-1"></i>
                  <span>Compressing...</span>
                </div>
              ) : showPreview ? (
                <>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      field.onChange(null);
                    }}
                    className="absolute top-2 right-2 z-10 w-7 h-7 bg-white text-red-500 rounded-full cursor-pointer shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
                  >
                    <i className="tabler-trash font-bold text-sm"></i>
                  </div>

                  <img
                    src={field.value}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400">
                  <i className={`text-4xl ${variant === 'profile' ? 'tabler-user' : 'tabler-photo'}`} />
                  <span className="text-xs mt-1">No Image</span>
                </div>
              )}
            </div>

            <div className="w-full flex justify-center relative">
              <input
                type="file"
                accept="image/*"
                id={uniqueId}
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];

                  if (!file) return;

                  if (!file.type.startsWith("image/")) {
                    toast.error("Only image files are allowed.");

                    return;
                  }

                  try {
                    setLoading(true);

                    const compressedFile = await compressImage(file, {
                      variant: variant,
                      maxSizeMB: 0.2,
                      maxWidth: variant === 'profile' ? 500 : 1024
                    });

                    const base64 = await toBase64(compressedFile);

                    // 👇 LOGIC BARU: Validasi Base64 sebelum set value
                    // Cek apakah string dimulai dengan 'data:image' (ciri khas base64 image)
                    if (base64 && base64.startsWith('data:image')) {
                      field.onChange(base64);

                      // Toast "Image ready" dihapus ✅
                    } else {
                      // Jika entah kenapa bukan base64, set undefined/null
                      field.onChange(undefined);
                      toast.error("Invalid image format processed.");
                    }

                  } catch (err) {
                    console.error(err);
                    toast.error("Failed to process image.");
                  } finally {
                    setLoading(false);
                    e.target.value = "";
                  }
                }}
              />
              <label
                htmlFor={uniqueId}
                className="bg-gray-700 hover:bg-gray-800 text-white text-sm rounded px-4 py-2 cursor-pointer flex items-center gap-2 transition-colors shadow-sm"
              >
                <i className="tabler-cloud-upload text-lg" />
                {variant === 'profile' ? 'Change Photo' : 'Change Image'}
              </label>
            </div>

            {fieldState.error && (
              <span className="text-red-500 text-xs text-center">{fieldState.error.message}</span>
            )}
          </div>
        );
      }}
    />
  );
};
