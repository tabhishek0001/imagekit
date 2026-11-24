# ImageKit Manual QA Plan

Use non-sensitive sample images. Test current Chrome, Firefox and Edge where available.

## General
- [ ] Page loads at desktop, tablet and mobile widths.
- [ ] File picker and drag-and-drop accept supported image formats.
- [ ] Unsupported files are rejected with a clear message.
- [ ] Add images in multiple batches; maximum 50 is enforced.
- [ ] Thumbnails, dimensions and file sizes display correctly.
- [ ] Removing one image revokes its preview and updates the list.
- [ ] Clear all removes selected files and generated download links.
- [ ] No uncaught console errors.

## Conversion and compression
- [ ] Convert JPG, PNG and WebP inputs to each supported output format.
- [ ] Test AVIF input/output on browsers that support it.
- [ ] Verify PNG ignores quality and lossy formats respond to quality.
- [ ] Verify output file extension matches actual Blob MIME type.
- [ ] Verify transparent PNG/WebP output and JPEG background fill.
- [ ] Verify GIF input is exported as a still image.

## Resize and crop
- [ ] Resize using width only, height only and both limits.
- [ ] Verify aspect ratio is preserved and small images are not enlarged.
- [ ] Verify square, 4:3, 3:4, 16:9, 9:16 and 3:2 center crops.
- [ ] Confirm original proportions are retained with the default crop setting.
- [ ] Reject non-integer, zero, negative and over-limit dimensions.

## Transform and adjustment
- [ ] Verify 90°, 180° and 270° rotation.
- [ ] Verify horizontal and vertical flips independently and together.
- [ ] Verify brightness and contrast changes.
- [ ] Verify output dimensions after rotation and crop.

## Batch and downloads
- [ ] Process one image and download its output.
- [ ] Process multiple images and download the ZIP.
- [ ] Verify ZIP contains every result with distinct filenames.
- [ ] Process again with different settings and verify stale links are cleared.
- [ ] Verify progress and error states.

## Privacy and accessibility
- [ ] Confirm no image content upload requests are made.
- [ ] Confirm no image content is stored in localStorage or IndexedDB.
- [ ] Confirm keyboard can activate the file picker.
- [ ] Confirm labels, focus states and status messages are usable.
