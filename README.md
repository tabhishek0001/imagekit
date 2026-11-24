# ImageKit — Everyday Image Toolkit

ImageKit is a browser-first workspace for common image tasks. It helps compress, resize, crop, rotate, flip, adjust and convert images without an account.

## Included in the MVP
- Batch image selection with thumbnails and file details.
- JPG, PNG, WebP, GIF and AVIF input where browser decoding is supported.
- WebP, JPEG, PNG and AVIF export where the browser supports the requested encoder.
- Adjustable quality for lossy output formats.
- Resize by maximum width and/or height while preserving proportions.
- Center crop with common aspect-ratio presets.
- Rotate, flip, brightness and contrast controls.
- JPEG background color for transparent images.
- Individual downloads and ZIP export for batches.

## Run locally
Serve the repository root with any local static HTTP server and open `index.html`.

The interface uses Bootstrap 5.3 and Font Awesome from public CDNs. JSZip is loaded from cdnjs for batch ZIP downloads. An internet connection is required to load these dependencies.

## Privacy
Supported image processing runs in your browser using the Canvas API. The app does not upload selected images to an ImageKit backend and does not store image contents in browser storage. CDN requests load the interface libraries. Avoid using shared or untrusted devices for confidential images.

## Limitations
- GIF files are processed as still images; animation is not retained.
- Crop is centered; freehand crop positioning is not included.
- AVIF support depends on browser decoding and encoding support; unsupported output is reported.
- Image metadata, EXIF orientation, color profiles and GPS data may not be preserved.
- Large images and batches are limited by browser memory and canvas capabilities.
- AI background removal, object erasing, layers, cloud storage, accounts and API access are not included.

## Project files
- `index.html` — application interface
- `assets/css/app.css` — responsive styling
- `assets/js/app.js` — browser-side image processing
- `PRODUCT-SPEC.md` — product scope and limitations
- `tests/TEST-PLAN.md` — manual QA checklist

## Status
Version 1.0.0 — MVP implementation in QA. Complete the manual test plan before public release.
