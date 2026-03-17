// lib/cloudinary.ts
//
// Thin wrapper around the Cloudinary Node SDK.
// Used by server actions / API routes that handle CMS media uploads.
//
// Required env vars:
//   CLOUDINARY_CLOUD_NAME
//   CLOUDINARY_API_KEY
//   CLOUDINARY_API_SECRET
//
// Optional (public URL construction only — no secret needed client-side):
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure:     true,
});

export { cloudinary };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CloudinaryUploadResult {
  publicId:     string;
  url:          string;
  secureUrl:    string;
  optimizedUrl: string;
  width:        number;
  height:       number;
  bytes:        number;
  format:       string;
  folder:       string;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

/**
 * Upload a file (Buffer or base64 data URI) to Cloudinary.
 *
 * @param file      - Buffer, base64 data URI string, or remote URL
 * @param folder    - Cloudinary folder path, e.g. "akiro/services"
 * @param publicId  - Optional stable public_id. If omitted, Cloudinary generates one.
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  folder: string,
  publicId?: string,
): Promise<CloudinaryUploadResult> {
  // Convert Buffer to base64 data URI
  const source =
    Buffer.isBuffer(file)
      ? `data:image/jpeg;base64,${file.toString("base64")}`
      : file;

  const result = await cloudinary.uploader.upload(source, {
    folder,
    public_id:        publicId,
    overwrite:        true,
    use_filename:     false,
    unique_filename:  !publicId,
    // Auto quality + format = smaller files, same visual quality
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

  return {
    publicId:     result.public_id,
    url:          result.url,
    secureUrl:    result.secure_url,
    optimizedUrl: buildOptimizedUrl(result.public_id),
    width:        result.width,
    height:       result.height,
    bytes:        result.bytes,
    format:       result.format,
    folder:       result.folder ?? folder,
  };
}

/**
 * Delete an asset from Cloudinary by its public_id.
 */
export async function deleteFromCloudinary(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

// ─── URL Builders ─────────────────────────────────────────────────────────────

/**
 * Build an optimized URL for a known public_id without calling the API.
 * Applies auto quality + format transformations.
 */
export function buildOptimizedUrl(
  publicId: string,
  options: { width?: number; height?: number; crop?: string } = {},
): string {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error("CLOUDINARY_CLOUD_NAME is not set");

  const transforms: string[] = ["q_auto", "f_auto"];
  if (options.width)  transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.crop)   transforms.push(`c_${options.crop}`);

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(",")}/${publicId}`;
}

/**
 * Build a responsive srcSet string for use in <img srcSet="…">.
 * widths defaults to [640, 960, 1280, 1920].
 */
export function buildSrcSet(
  publicId: string,
  widths = [640, 960, 1280, 1920],
): string {
  return widths
    .map((w) => `${buildOptimizedUrl(publicId, { width: w })} ${w}w`)
    .join(", ");
}