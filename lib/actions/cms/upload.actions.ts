// lib/actions/cms/upload.actions.ts
"use server";

import { cloudinary } from "@/lib/cloudinary";

export interface UploadResult {
  url:      string;
  publicId: string;
}

/**
 * Upload a base64-encoded file to Cloudinary and return the secure URL.
 * Called from client components via a server action.
 *
 * @param base64    - Full data URI, e.g. "data:image/jpeg;base64,/9j/..."
 * @param folder    - Cloudinary folder, e.g. "akiro/gallery"
 * @param publicId  - Optional stable public_id to overwrite an existing asset
 */
export async function uploadImage(
  base64:   string,
  folder:   string,
  publicId?: string,
): Promise<UploadResult> {
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    public_id:       publicId,
    overwrite:       true,
    unique_filename: !publicId,
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

  return {
    url:      result.secure_url,
    publicId: result.public_id,
  };
}