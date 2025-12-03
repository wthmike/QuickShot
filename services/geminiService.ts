
// Re-purposed service for Local Film Emulation
// No external APIs are used. All processing happens on the device GPU/CPU via Canvas 2D.

// Utility to resize images to avoid OOM crashes on mobile
async function resizeImage(img: HTMLImageElement, maxWidth: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, maxWidth / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
    return canvas;
}

// Utility to wrap text for canvas
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    // If text preserves newlines, handle them
    const paragraphs = text.split('\n');

    for(let p = 0; p < paragraphs.length; p++) {
        const words = paragraphs[p].split(' ');
        line = '';
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
        currentY += lineHeight;
        // Extra gap for paragraphs
        if (p < paragraphs.length - 1) {
             currentY += (lineHeight * 0.5);
        }
    }
    return currentY;
}

export async function stitchBurst(images: string[], headerText: string, footerText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (images.length !== 4) {
      reject(new Error("Burst requires exactly 4 images"));
      return;
    }

    const imgObjects = images.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });

    // Wait for all images to load
    Promise.all(imgObjects.map(img => new Promise((r, f) => {
        img.onload = r;
        img.onerror = f;
    })))
      .then(async () => {
        try {
            // SAFETY: Resize images first.
            // Target 800px squares.
            const TARGET_SIZE = 800; 
            const resizedCanvases = await Promise.all(
                imgObjects.map(img => resizeImage(img, TARGET_SIZE))
            );

            const size = resizedCanvases[0].width; // Assuming square
            
            // Dynamic Layout: 2x2 Grid (Quadtych Poster)
            // Style: Swiss Editorial
            const padding = Math.floor(size * 0.1); // Outer margin
            const gap = Math.floor(size * 0.04);     // Gap between grid items
            const headerHeight = Math.floor(size * 0.3); 
            const footerHeight = Math.floor(size * 0.4); 
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error("No context"));
              return;
            }

            // Width: Padding + Image + Gap + Image + Padding
            const gridWidth = (size * 2) + gap;
            canvas.width = gridWidth + (padding * 2);
            
            // Height: Header + GridHeight + Footer
            const gridHeight = (size * 2) + gap;
            canvas.height = headerHeight + gridHeight + footerHeight + padding; // Extra padding at bottom

            // 1. Background (Matte Black)
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Header
            // Replaced HIPPOCAM with Coordinates (headerText)
            ctx.fillStyle = '#E5E5E5';
            ctx.font = `600 ${Math.floor(size * 0.05)}px Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.letterSpacing = '0.05em';
            ctx.fillText(headerText.toUpperCase(), padding, headerHeight * 0.65);
            
            // 3. Draw Grid
            resizedCanvases.forEach((img, index) => {
                // Col: 0 or 1
                const col = index % 2;
                // Row: 0 or 1
                const row = Math.floor(index / 2);

                const x = padding + (col * (size + gap));
                const y = headerHeight + (row * (size + gap));

                // Draw Image
                ctx.drawImage(img, x, y, size, size);

                // Optional: Draw a thin white border around each photo for separation
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, size, size);
            });

            // 4. Footer Metadata
            const footerY = headerHeight + gridHeight + (padding * 0.8);
            
            ctx.fillStyle = '#E5E5E5';
            ctx.textAlign = 'left';
            
            // Location Name (Replaces old coords/random number)
            ctx.font = `700 ${Math.floor(size * 0.08)}px Inter, sans-serif`;
            ctx.letterSpacing = '-0.03em';
            
            // Truncate footer text if too long to avoid overlap with date
            let displayFooter = footerText.toUpperCase();
            const maxFooterWidth = canvas.width * 0.6;
            if (ctx.measureText(displayFooter).width > maxFooterWidth) {
                 // Simple truncation
                 while (ctx.measureText(displayFooter + '...').width > maxFooterWidth && displayFooter.length > 0) {
                     displayFooter = displayFooter.slice(0, -1);
                 }
                 displayFooter += '...';
            }
            
            ctx.fillText(displayFooter, padding, footerY + (size * 0.1));
            
            // Info Block
            const date = new Date();
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            ctx.textAlign = 'right';
            ctx.fillStyle = '#666';
            ctx.font = `500 ${Math.floor(size * 0.04)}px Inter, sans-serif`;
            ctx.letterSpacing = '0.05em';
            ctx.fillText(`${dateStr} — ${timeStr}`, canvas.width - padding, footerY + (size * 0.1));

            // COMPRESSION: Use WebP at 0.80 quality
            resolve(canvas.toDataURL('image/webp', 0.80));
        } catch (e) {
            reject(e);
        }
      })
      .catch(reject);
  });
}

export async function processImageNatural(base64Image: string, caption?: string): Promise<{ combinedUrl: string, frames: string[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        // SAFETY: Downscale large images to prevent crash.
        let targetWidth = img.width;
        let targetHeight = img.height;
        const MAX_WIDTH = 2000;

        if (targetWidth > MAX_WIDTH) {
            const scale = MAX_WIDTH / targetWidth;
            targetWidth = MAX_WIDTH;
            targetHeight = img.height * scale;
        }

        // --- Calculate Internal Layout Metrics ---
        // We need to know where the footer text (Location Name) sits to place the caption right underneath.
        // We reverse-engineer the logic from stitchBurst using the width.
        // Formula: gridWidth = (size * 2) + gap + (padding * 2)
        // With ratios: size*2 + size*0.04 + size*0.2 = size * 2.24
        // So:
        const gridSize = Math.floor(targetWidth / 2.24); // This corresponds to 'size' in stitchBurst
        const padding = Math.floor(gridSize * 0.1);
        const gap = Math.floor(gridSize * 0.04);
        const headerHeight = Math.floor(gridSize * 0.3);
        const gridHeight = (gridSize * 2) + gap;
        const footerY = headerHeight + gridHeight + (padding * 0.8);
        const locationFontSize = Math.floor(gridSize * 0.08);
        
        // Approximate Y position where the Location Name ends
        // location text drawn at: footerY + (gridSize * 0.1)
        // Its baseline is there. So we add a small gap below the baseline.
        const locationBaselineY = footerY + (gridSize * 0.1);
        const captionStartY = locationBaselineY + (locationFontSize * 0.4); // Tighter spacing

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight; // Try to fit in existing height first

        // Fill Base (Black)
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // --- STEP 1: DRAW BASE IMAGE ---
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // --- STEP 1.5: SELECTIVE FAUX MOTION BLUR ---
        const photoRects = [
            { x: padding, y: headerHeight, w: gridSize, h: gridSize }, // TL
            { x: padding + gridSize + gap, y: headerHeight, w: gridSize, h: gridSize }, // TR
            { x: padding, y: headerHeight + gridSize + gap, w: gridSize, h: gridSize }, // BL
            { x: padding + gridSize + gap, y: headerHeight + gridSize + gap, w: gridSize, h: gridSize } // BR
        ];

        // Randomly select 2 unique indices for the "shutter drag" effect
        const indices = [0, 1, 2, 3];
        indices.sort(() => Math.random() - 0.5);
        const selectedIndices = indices.slice(0, 2);

        selectedIndices.forEach(idx => {
            const rect = photoRects[idx];
            
            const photoCanvas = document.createElement('canvas');
            photoCanvas.width = rect.w;
            photoCanvas.height = rect.h;
            const pCtx = photoCanvas.getContext('2d');
            if (!pCtx) return;
            pCtx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

            const blurCanvas = document.createElement('canvas');
            blurCanvas.width = rect.w;
            blurCanvas.height = rect.h;
            const bCtx = blurCanvas.getContext('2d');
            if (!bCtx) return;

            const numCopies = 8;
            const blurAmount = gridSize * 0.012;
            const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8);

            bCtx.globalCompositeOperation = 'source-over';
            
            const zoom = 1.05;
            const zw = rect.w * zoom;
            const zh = rect.h * zoom;
            const zx = (rect.w - zw) / 2;
            const zy = (rect.h - zh) / 2;
            
            for (let i = 0; i < numCopies; i++) {
                const ratio = i / (numCopies - 1); 
                const offset = (ratio - 0.5) * blurAmount;
                const ox = offset * Math.cos(angle);
                const oy = offset * Math.sin(angle);
                const alpha = 1.0 / (numCopies * 0.6); 
                bCtx.globalAlpha = alpha;
                bCtx.drawImage(photoCanvas, zx + ox, zy + oy, zw, zh);
            }
            
            ctx.save();
            ctx.beginPath();
            ctx.rect(rect.x, rect.y, rect.w, rect.h);
            ctx.clip();
            ctx.drawImage(blurCanvas, rect.x, rect.y, rect.w, rect.h);
            ctx.restore();

            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        });

        // --- STEP 2: DRAW CAPTION (INTEGRATED) ---
        // Style: Small, technical, grey, just underneath location name
        if (caption && caption.trim().length > 0) {
             const fontSize = Math.floor(gridSize * 0.035); // Small font
             const lineHeight = fontSize * 1.4;
             const maxTextWidth = canvas.width - (padding * 2);

             ctx.fillStyle = '#999'; // Slightly lighter grey for readability
             ctx.font = `400 ${fontSize}px Inter, sans-serif`; 
             ctx.textAlign = 'left';
             ctx.textBaseline = 'top';
             ctx.letterSpacing = '0.02em';

             // Check if we need to extend canvas height
             const measureLinesHeight = wrapText(ctx, caption, padding, captionStartY, maxTextWidth, lineHeight) - captionStartY;
             const requiredHeight = captionStartY + measureLinesHeight + padding;

             if (requiredHeight > canvas.height) {
                 // Get current image data
                 const currentImage = ctx.getImageData(0,0,canvas.width, canvas.height);
                 canvas.height = requiredHeight;
                 ctx.fillStyle = '#0a0a0a';
                 ctx.fillRect(0,0, canvas.width, canvas.height);
                 ctx.putImageData(currentImage, 0, 0);
                 
                 // Reset context state after resize
                 ctx.fillStyle = '#999';
                 ctx.font = `400 ${fontSize}px Inter, sans-serif`; 
                 ctx.textAlign = 'left';
                 ctx.textBaseline = 'top';
                 ctx.letterSpacing = '0.02em';
             }

             wrapText(ctx, caption, padding, captionStartY, maxTextWidth, lineHeight);
        }

        // --- STEP 3: HIGH-END PORTRA LOOK ---
        
        // A. HALATION (Bloom)
        const halationCanvas = document.createElement('canvas');
        halationCanvas.width = canvas.width;
        halationCanvas.height = canvas.height;
        const hCtx = halationCanvas.getContext('2d');
        if (hCtx) {
            hCtx.drawImage(canvas, 0, 0);
            hCtx.filter = 'blur(10px)'; 
            hCtx.drawImage(halationCanvas, 0, 0); 
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.2; 
            ctx.drawImage(halationCanvas, 0, 0);
            ctx.globalAlpha = 1.0;
        }

        // B. COLOR GRADING 
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 230, 210, 0.15)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(10, 20, 30, 0.15)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // C. FINE GRAIN 
        ctx.globalCompositeOperation = 'overlay';
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = 256; 
        grainCanvas.height = 256;
        const grainCtx = grainCanvas.getContext('2d');
        if (grainCtx) {
            const imageData = grainCtx.createImageData(256, 256);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const val = 100 + Math.random() * 55; 
                data[i] = val;     
                data[i + 1] = val; 
                data[i + 2] = val; 
                data[i + 3] = 35;  
            }
            grainCtx.putImageData(imageData, 0, 0);
            const pattern = ctx.createPattern(grainCanvas, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.globalAlpha = 0.8; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1.0;
            }
        }
        
        ctx.globalCompositeOperation = 'source-over';

        // --- STEP 4: EXTRACT INDIVIDUAL PROCESSED FRAMES ---
        // We cut the canvas back into 4 frames so we can loop them with all filters applied.
        const processedFrames: string[] = [];
        const extractRects = [
            { x: padding, y: headerHeight, w: gridSize, h: gridSize },
            { x: padding + gridSize + gap, y: headerHeight, w: gridSize, h: gridSize },
            { x: padding, y: headerHeight + gridSize + gap, w: gridSize, h: gridSize },
            { x: padding + gridSize + gap, y: headerHeight + gridSize + gap, w: gridSize, h: gridSize }
        ];

        for (const rect of extractRects) {
            const tempC = document.createElement('canvas');
            tempC.width = rect.w;
            tempC.height = rect.h;
            const tempCtx = tempC.getContext('2d');
            if (tempCtx) {
                // Grab the exact pixels from the final canvas
                tempCtx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
                // COMPRESSION: Use WebP at 0.80
                processedFrames.push(tempC.toDataURL('image/webp', 0.80));
            }
        }

        resolve({
            // COMPRESSION: Use WebP at 0.80
            combinedUrl: canvas.toDataURL('image/webp', 0.80),
            frames: processedFrames
        });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = base64Image;
  });
}
