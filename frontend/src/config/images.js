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
// Values are S3 object keys (relative paths inside the bucket)
export const productImages = {
  "prod-1":  img("products/instax-mini-12.jpg")   || img("assets/images/thumbs/product-two-img1.png"),
  "prod-2":  img("products/sony-wh1000xm5.jpg")   || img("assets/images/thumbs/product-two-img2.png"),
  "prod-3":  img("products/samsung-s24-ultra.jpg") || img("assets/images/thumbs/product-two-img3.png"),
  "prod-4":  img("products/macbook-pro-m3.jpg")    || img("assets/images/thumbs/product-two-img4.png"),
  "prod-5":  img("products/anker-usb-hub.jpg")     || img("assets/images/thumbs/product-two-img5.png"),
  "prod-6":  img("products/logitech-mx-master.jpg")|| img("assets/images/thumbs/product-two-img6.png"),
  "prod-7":  img("products/ipad-pro-m2.jpg")       || img("assets/images/thumbs/product-two-img7.png"),
  "prod-8":  img("products/jbl-charge-5.jpg")      || img("assets/images/thumbs/product-two-img8.png"),
  "prod-9":  img("products/gopro-hero12.jpg")      || img("assets/images/thumbs/product-two-img9.png"),
  "prod-10": img("products/xiaomi-redmi-note13.jpg")|| img("assets/images/thumbs/product-two-img10.png"),
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
