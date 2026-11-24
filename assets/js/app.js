(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const state = { files: [], busy: false, outputs: [] };
  const MAX_FILES = 50;
  const MAX_PIXELS = 40000000;
  const MAX_DIMENSION = 12000;
  const supportedInputs = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
  const formatBytes = (bytes) => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(2) + ' MB';
  const safeBase = (name) => name.replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'image';
  const setStatus = (message, error = false) => { $('#status-message').textContent = message; $('#status-message').classList.toggle('text-danger', error); };
  const clearOutputs = () => { state.outputs.forEach((item) => URL.revokeObjectURL(item.url)); state.outputs = []; $('#result-area').hidden = true; $('#result-area').replaceChildren(); };
  const updateControls = () => {
    $('#file-count').textContent = state.files.length + (state.files.length === 1 ? ' file' : ' files');
    $('#clear-files').disabled = !state.files.length || state.busy;
    $('#process-btn').disabled = !state.files.length || state.busy;
  };
  const renderFiles = () => {
    const grid = $('#file-grid'); grid.replaceChildren();
    if (!state.files.length) {
      const empty = document.createElement('div'); empty.className = 'empty-state'; empty.innerHTML = '<i class="fa-regular fa-images"></i><span>Your selected images will appear here.</span>'; grid.append(empty);
    }
    state.files.forEach((entry, index) => {
      const card = document.createElement('article'); card.className = 'image-card';
      const img = document.createElement('img'); img.src = entry.url; img.alt = '';
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-image'; remove.setAttribute('aria-label', 'Remove ' + entry.file.name); remove.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      remove.addEventListener('click', () => { URL.revokeObjectURL(entry.url); state.files.splice(index, 1); clearOutputs(); renderFiles(); setStatus('Image removed.'); });
      const name = document.createElement('div'); name.className = 'image-name'; name.textContent = entry.file.name; name.title = entry.file.name;
      const meta = document.createElement('div'); meta.className = 'image-meta'; meta.textContent = formatBytes(entry.file.size) + ' · ' + entry.width + ' × ' + entry.height;
      card.append(img, remove, name, meta); grid.append(card);
    });
    updateControls();
  };
  const readDimensions = async (file) => {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file);
      const result = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return result;
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const image = new Image();
      image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be decoded by your browser.')); };
      image.src = url;
    });
  };
  const addFiles = async (incoming) => {
    if (state.busy) return;
    const remaining = MAX_FILES - state.files.length;
    if (remaining <= 0) { setStatus('The maximum of ' + MAX_FILES + ' images has been reached.', true); return; }
    const accepted = incoming.filter((file) => supportedInputs.has(file.type) || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name));
    if (accepted.length !== incoming.length) setStatus('Some files were skipped. Choose JPG, PNG, WebP, GIF or AVIF images.', true);
    const batch = accepted.slice(0, remaining);
    for (const file of batch) {
      try {
        if (!file.size) throw new Error('The file is empty.');
        const dimensions = await readDimensions(file);
        if (!dimensions.width || !dimensions.height || dimensions.width * dimensions.height > MAX_PIXELS || Math.max(dimensions.width, dimensions.height) > MAX_DIMENSION) {
          setStatus('Skipped ' + file.name + ': image dimensions exceed the safe browser-processing limit.', true);
          continue;
        }
        state.files.push({ file, url: URL.createObjectURL(file), ...dimensions });
      } catch (error) { setStatus('Skipped ' + file.name + ': ' + error.message, true); }
    }
    clearOutputs(); renderFiles();
    if (accepted.length > remaining) setStatus('Only the first ' + remaining + ' image(s) were added. Maximum: ' + MAX_FILES + '.', true);
    else if (state.files.length) setStatus(state.files.length + ' image(s) ready to process.');
  };
  const settings = () => ({
    format: $('#format').value,
    quality: Number($('#quality').value) / 100,
    crop: $('#crop-ratio').value,
    maxWidth: $('#max-width').value === '' ? null : Number($('#max-width').value),
    maxHeight: $('#max-height').value === '' ? null : Number($('#max-height').value),
    background: $('#background').value,
    rotation: Number($('#rotation').value) * Math.PI / 180,
    flipH: $('#flip-h').checked,
    flipV: $('#flip-v').checked,
    brightness: Number($('#brightness').value),
    contrast: Number($('#contrast').value)
  });
  const cropDimensions = (width, height, ratio) => {
    if (ratio === 'free') return { width, height };
    const [rw, rh] = ratio.split(':').map(Number); const target = rw / rh; const current = width / height;
    return current > target ? { width: height * target, height } : { width, height: width / target };
  };
  const loadBitmap = async (file) => {
    if ('createImageBitmap' in window) return createImageBitmap(file);
    return new Promise((resolve, reject) => { const image = new Image(); const url = URL.createObjectURL(file); image.onload = () => { URL.revokeObjectURL(url); resolve(image); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image.')); }; image.src = url; });
  };
  const canvasBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => { if (!blob) return reject(new Error('Image export failed. Try another output format.')); if (blob.type !== type) return reject(new Error(type.split('/')[1].toUpperCase() + ' export is not supported by this browser. Choose WebP, JPEG or PNG.')); resolve(blob); }, type, quality);
  });
  const processOne = async (entry, opts) => {
    const bitmap = await loadBitmap(entry.file);
    try {
      const rotated = Math.abs(opts.rotation % Math.PI) > .001;
      const swap = Math.abs(Math.round(opts.rotation / (Math.PI / 2)) % 2) === 1;
      const orientedW = swap ? bitmap.height : bitmap.width;
      const orientedH = swap ? bitmap.width : bitmap.height;
      const oriented = document.createElement('canvas');
      oriented.width = orientedW; oriented.height = orientedH;
      const ctx = oriented.getContext('2d', { alpha: true });
      if (!ctx) throw new Error('Canvas is unavailable in this browser.');
      ctx.translate(orientedW / 2, orientedH / 2);
      ctx.rotate(opts.rotation);
      ctx.scale(opts.flipH ? -1 : 1, opts.flipV ? -1 : 1);
      ctx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
      const crop = cropDimensions(orientedW, orientedH, opts.crop);
      const cropX = (orientedW - crop.width) / 2;
      const cropY = (orientedH - crop.height) / 2;
      let targetW = crop.width; let targetH = crop.height;
      const maxW = opts.maxWidth && Number.isFinite(opts.maxWidth) && opts.maxWidth > 0 ? Math.min(opts.maxWidth, MAX_DIMENSION) : Infinity;
      const maxH = opts.maxHeight && Number.isFinite(opts.maxHeight) && opts.maxHeight > 0 ? Math.min(opts.maxHeight, MAX_DIMENSION) : Infinity;
      const scale = Math.min(1, maxW / targetW, maxH / targetH);
      targetW = Math.max(1, Math.round(targetW * scale)); targetH = Math.max(1, Math.round(targetH * scale));
      if (targetW * targetH > MAX_PIXELS) throw new Error('Output dimensions are too large. Reduce the maximum width or height.');
      const output = document.createElement('canvas'); output.width = targetW; output.height = targetH;
      const out = output.getContext('2d', { alpha: opts.format !== 'image/jpeg' });
      if (!out) throw new Error('Canvas export is unavailable.');
      if (opts.format === 'image/jpeg') { out.fillStyle = opts.background; out.fillRect(0, 0, targetW, targetH); }
      out.filter = 'brightness(' + opts.brightness + '%) contrast(' + opts.contrast + '%)';
      out.drawImage(oriented, cropX, cropY, crop.width, crop.height, 0, 0, targetW, targetH);
      const blob = await canvasBlob(output, opts.format, opts.quality);
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' })[opts.format];
      const outputName = safeBase(entry.file.name) + '-imagekit.' + ext;
      output.width = output.height = oriented.width = oriented.height = 1;
      return { blob, name: outputName, width: targetW, height: targetH };
    } finally { if (bitmap.close) bitmap.close(); }
  };
  const addResultLink = (parent, output) => {
    const row = document.createElement('div'); row.className = 'result-item';
    const info = document.createElement('span'); info.textContent = output.name + ' · ' + output.width + ' × ' + output.height + ' · ' + formatBytes(output.blob.size);
    const link = document.createElement('a'); link.href = output.url; link.download = output.name; link.textContent = 'Download';
    row.append(info, link); parent.append(row);
  };
  const processImages = async () => {
    if (state.busy || !state.files.length) return;
    const opts = settings();
    for (const [label, value] of [['Max width', opts.maxWidth], ['Max height', opts.maxHeight]]) {
      if (value !== null && (!Number.isInteger(value) || value < 1 || value > MAX_DIMENSION)) { setStatus(label + ' must be a whole number between 1 and ' + MAX_DIMENSION + '.', true); return; }
    }
    state.busy = true; clearOutputs(); updateControls(); $('#progress-wrap').hidden = false; $('#progress-bar').style.width = '0%'; $('#progress-bar').setAttribute('aria-valuenow', '0');
    const result = $('#result-area'); result.hidden = false; result.replaceChildren();
    const heading = document.createElement('strong'); heading.textContent = 'Your processed images'; result.append(heading);
    try {
      const outputs = []; const usedNames = new Set();
      for (let i = 0; i < state.files.length; i++) {
        setStatus('Processing image ' + (i + 1) + ' of ' + state.files.length + '…');
        const output = await processOne(state.files[i], opts);
        const originalName = output.name; let suffix = 2;
        while (usedNames.has(output.name.toLowerCase())) { const dot = originalName.lastIndexOf('.'); output.name = originalName.slice(0, dot) + '-' + suffix++ + originalName.slice(dot); }
        usedNames.add(output.name.toLowerCase());
        output.url = URL.createObjectURL(output.blob); outputs.push(output); state.outputs.push(output);
        addResultLink(result, output);
        const percent = Math.round(((i + 1) / state.files.length) * 100); $('#progress-bar').style.width = percent + '%'; $('#progress-bar').setAttribute('aria-valuenow', String(percent));
      }
      if (outputs.length > 1) {
        if (!window.JSZip) throw new Error('ZIP support could not load. Download the individual files listed above.');
        const zip = new JSZip(); outputs.forEach((item) => zip.file(item.name, item.blob));
        setStatus('Preparing ZIP archive…');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipUrl = URL.createObjectURL(zipBlob); state.outputs.push({ url: zipUrl });
        const zipRow = document.createElement('div'); zipRow.className = 'd-flex justify-content-between align-items-center flex-wrap gap-2 border-top mt-2 pt-3';
        const zipText = document.createElement('strong'); zipText.textContent = 'All images · ' + formatBytes(zipBlob.size);
        const zipLink = document.createElement('a'); zipLink.className = 'btn btn-sm btn-success'; zipLink.href = zipUrl; zipLink.download = 'imagekit-processed-images.zip'; zipLink.innerHTML = '<i class="fa-solid fa-file-zipper me-1"></i> Download ZIP';
        zipRow.append(zipText, zipLink); result.append(zipRow);
      }
      setStatus(outputs.length + ' image(s) processed successfully.');
    } catch (error) { setStatus(error.message || 'Could not process the selected images.', true); }
    finally { state.busy = false; updateControls(); }
  };
  const updateRangeLabels = () => {
    $('#quality-value').textContent = $('#quality').value + '%';
    $('#brightness-value').textContent = $('#brightness').value + '%';
    $('#contrast-value').textContent = $('#contrast').value + '%';
  };
  $('#drop-zone').addEventListener('click', () => $('#file-input').click());
  $('#drop-zone').addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('#file-input').click(); } });
  $('#file-input').addEventListener('change', (event) => { const selected = [...event.target.files]; event.target.value = ''; addFiles(selected); });
  ['dragenter', 'dragover'].forEach((type) => $('#drop-zone').addEventListener(type, (event) => { event.preventDefault(); $('#drop-zone').classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((type) => $('#drop-zone').addEventListener(type, (event) => { event.preventDefault(); $('#drop-zone').classList.remove('dragover'); }));
  $('#drop-zone').addEventListener('drop', (event) => { addFiles([...event.dataTransfer.files]); });
  $('#clear-files').addEventListener('click', () => { state.files.forEach((entry) => URL.revokeObjectURL(entry.url)); state.files = []; clearOutputs(); renderFiles(); setStatus('All selected images cleared.'); });
  $('#process-btn').addEventListener('click', processImages);
  ['quality', 'brightness', 'contrast'].forEach((id) => $('#' + id).addEventListener('input', updateRangeLabels));
  ['format', 'crop-ratio', 'max-width', 'max-height', 'background', 'rotation', 'flip-h', 'flip-v', 'quality', 'brightness', 'contrast'].forEach((id) => $('#' + id).addEventListener('change', clearOutputs));
  $('#reset-settings').addEventListener('click', () => {
    $('#format').value = 'image/webp'; $('#quality').value = 82; $('#crop-ratio').value = 'free'; $('#max-width').value = ''; $('#max-height').value = ''; $('#background').value = '#ffffff'; $('#rotation').value = '0'; $('#flip-h').checked = false; $('#flip-v').checked = false; $('#brightness').value = 100; $('#contrast').value = 100; updateRangeLabels(); clearOutputs(); setStatus('Output settings reset.');
  });
  $('#year').textContent = new Date().getFullYear();
  updateRangeLabels(); renderFiles();
})();