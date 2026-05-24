/**
 * config/images.js
 *
 * Central image registry — swap LOCAL paths for S3/CloudFront URLs here.
 *
 * HOW TO USE WITH AWS S3:
 *   1. Create bucket:  orbitra-product-images  (region: ap-south-1)
 *   2. Upload to:      /products/iphone.jpg, /products/headphones.jpg …
 *   3. Set REACT_APP_CDN_URL in .env:
 *        REACT_APP_CDN_URL=https://orbitra-product-images.s3.ap-south-1.amazonaws.com
 *      OR with CloudFront:
 *        REACT_APP_CDN_URL=https://dxxxxx.cloudfront.net
 *   4. Images resolve automatically — no other code changes needed.
 *
 * BUCKET POLICY (paste in S3 → Permissions → Bucket Policy):
 * {
 *   "Version": "2012-10-17",
 *   "Statement": [{
 *     "Sid": "PublicRead",
 *     "Effect": "Allow",
 *     "Principal": "*",
 *     "Action": "s3:GetObject",
 *     "Resource": "arn:aws:s3:::orbitra-product-images/*"
 *   }]
 * }
 */

// Base CDN/S3 URL — falls back to local public/assets when not set
const CDN = process.env.REACT_APP_CDN_URL || "";

/**
 * Resolve an image path:
 *   - If CDN is set → full S3/CloudFront URL
 *   - Otherwise    → local public/assets path (works out of the box)
 */
export function img(path) {
  if (CDN) return `${CDN}/${path.replace(/^\//, "")}`;
  return path; // local path served from /public
}

// ── Product image map ─────────────────────────────────────────────────────────
// Real Pexels photos matched to each product
export const productImages = {
  "prod-1":  CDN ? `${CDN}/products/instax-mini-12.jpg`     : "https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-2":  CDN ? `${CDN}/products/sony-wh1000xm5.jpg`    : "https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-3":  CDN ? `${CDN}/products/samsung-s24-ultra.jpg`  : "https://images.pexels.com/photos/404280/pexels-photo-404280.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-4":  CDN ? `${CDN}/products/macbook-pro-m3.jpg`     : "https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=400",
  "prod-5":  CDN ? `${CDN}/products/anker-usb-hub.jpg`      : "https://images.pexels.com/photos/4219654/pexels-photo-4219654.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-6":  CDN ? `${CDN}/products/logitech-mx-master.jpg` : "https://images.pexels.com/photos/2115257/pexels-photo-2115257.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-7":  CDN ? `${CDN}/products/ipad-pro-m2.jpg`        : "https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-8":  CDN ? `${CDN}/products/jbl-charge-5.jpg`       : "https://images.pexels.com/photos/1279107/pexels-photo-1279107.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-9":  CDN ? `${CDN}/products/gopro-hero12.jpg`       : "https://images.pexels.com/photos/1092671/pexels-photo-1092671.jpeg?auto=compress&cs=tinysrgb&w=400",
  "prod-10": CDN ? `${CDN}/products/xiaomi-redmi-note13.jpg`: "https://images.pexels.com/photos/699122/pexels-photo-699122.jpeg?auto=compress&cs=tinysrgb&w=400",
};

// Fallback image shown when any product image fails to load
export const FALLBACK_IMAGE = "https://placehold.co/400x400/f1f5f9/94a3b8?text=Product";

/**
 * Get image URL for a product — prefers S3, falls back to local asset.
 * @param {string} productId
 * @param {string} [localPath] - optional override from product data
 */
export function getProductImage(productId, localPath) {
  if (CDN && productImages[productId]) return productImages[productId];
  return localPath || productImages[productId] || FALLBACK_IMAGE;
}
