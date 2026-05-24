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
// Keys match product IDs in data/products.js
// Local fallbacks use the correct existing images from public/assets/images/thumbs/
export const productImages = {
  "prod-1":  CDN ? `${CDN}/products/instax-mini-12.jpg`    : "assets/images/thumbs/product-details-img1.png",   // Camera
  "prod-2":  CDN ? `${CDN}/products/sony-wh1000xm5.jpg`   : "assets/images/thumbs/product-details-img2.png",   // Headphone
  "prod-3":  CDN ? `${CDN}/products/samsung-s24-ultra.jpg` : "assets/images/thumbs/product-details-img3.png",   // Mobile
  "prod-4":  CDN ? `${CDN}/products/macbook-pro-m3.jpg`    : "assets/images/thumbs/feature-img1.png",           // Laptop
  "prod-5":  CDN ? `${CDN}/products/anker-usb-hub.jpg`     : "assets/images/thumbs/feature-img2.png",           // USB
  "prod-6":  CDN ? `${CDN}/products/logitech-mx-master.jpg`: "assets/images/thumbs/feature-img3.png",           // Accessories
  "prod-7":  CDN ? `${CDN}/products/ipad-pro-m2.jpg`       : "assets/images/thumbs/feature-img4.png",           // Tablet
  "prod-8":  CDN ? `${CDN}/products/jbl-charge-5.jpg`      : "assets/images/thumbs/feature-img5.png",           // Speaker
  "prod-9":  CDN ? `${CDN}/products/gopro-hero12.jpg`      : "assets/images/thumbs/feature-img6.png",           // Camera
  "prod-10": CDN ? `${CDN}/products/xiaomi-redmi-note13.jpg`: "assets/images/thumbs/feature-img7.png",          // Mobile
};

// Fallback image shown when any product image fails to load
export const FALLBACK_IMAGE = "assets/images/thumbs/product-two-img1.png";

/**
 * Get image URL for a product — prefers S3, falls back to local asset.
 * @param {string} productId
 * @param {string} [localPath] - optional override from product data
 */
export function getProductImage(productId, localPath) {
  if (CDN && productImages[productId]) return productImages[productId];
  return localPath || productImages[productId] || FALLBACK_IMAGE;
}
