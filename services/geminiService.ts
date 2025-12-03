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

export async function stitchBurst(images: string[]): Promise<string> {
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
            ctx.fillStyle = '#E5E5E5';
            ctx.font = `bold ${Math.floor(size * 0.08)}px Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.letterSpacing = '0.05em';
            ctx.fillText('QUICK-PROOF', padding, headerHeight * 0.5);
            
            ctx.fillStyle = '#666';
            ctx.font = `400 ${Math.floor(size * 0.04)}px Inter, sans-serif`;
            ctx.fillText('NATURECAM OPTICAL SYSTEM', padding, headerHeight * 0.75);

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
            
            // Big Sequence ID
            ctx.font = `900 ${Math.floor(size * 0.15)}px Inter, sans-serif`;
            ctx.letterSpacing = '-0.05em';
            ctx.fillText('004', padding, footerY + (size * 0.15));
            
            // Info Block
            const date = new Date();
            const dateStr = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            ctx.textAlign = 'right';
            ctx.fillStyle = '#666';
            ctx.font = `500 ${Math.floor(size * 0.04)}px Inter, sans-serif`;
            ctx.letterSpacing = '0.1em';
            ctx.fillText(`${dateStr} — ${timeStr}`, canvas.width - padding, footerY + (size * 0.15));

            // Technical Specs at very bottom
            ctx.textAlign = 'left';
            ctx.fillStyle = '#444';
            ctx.font = `400 ${Math.floor(size * 0.03)}px Inter, sans-serif`;
            ctx.fillText(`SEQ_${Date.now()} // 4X EXPOSURE // 6x6 FORMAT`, padding, canvas.height - (padding * 0.3));

            resolve(canvas.toDataURL('image/jpeg', 0.90));
        } catch (e) {
            reject(e);
        }
      })
      .catch(reject);
  });
}

export async function processImageNatural(base64Image: string, caption?: string): Promise<string> {
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

        // --- Calculate Layout Dimensions with Caption ---
        let extraHeightForCaption = 0;
        let captionPadding = 0;
        let fontSize = 0;
        let lineHeight = 0;

        if (caption && caption.trim().length > 0) {
            captionPadding = Math.floor(targetWidth * 0.1);
            fontSize = Math.floor(targetWidth * 0.045); 
            lineHeight = fontSize * 1.5;
            
            const measureCanvas = document.createElement('canvas');
            const measureCtx = measureCanvas.getContext('2d');
            if (measureCtx) {
                measureCtx.font = `400 ${fontSize}px Inter, sans-serif`;
                const maxWidth = targetWidth - (captionPadding * 2);
                
                const paragraphs = caption.split('\n');
                let linesCount = 0;
                
                for(let p=0; p<paragraphs.length; p++) {
                    const words = paragraphs[p].split(' ');
                    let line = '';
                    for (let n = 0; n < words.length; n++) {
                         const testLine = line + words[n] + ' ';
                         const metrics = measureCtx.measureText(testLine);
                         if (metrics.width > maxWidth && n > 0) {
                             line = words[n] + ' ';
                             linesCount++;
                         } else {
                             line = testLine;
                         }
                    }
                    linesCount++; 
                    linesCount += 0.5; // Paragraph gap
                }
                extraHeightForCaption = (linesCount * lineHeight) + (captionPadding * 1.5);
            }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight + extraHeightForCaption;

        // Fill Base (Black)
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // --- STEP 1: DRAW BASE IMAGE ---
        // We draw the base image first.
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // --- STEP 1.5: SELECTIVE FAUX MOTION BLUR ---
        // Apply stylistic shutter drag to only 2 random photos in the grid.
        
        // Recover Grid Metrics
        // Based on stitchBurst: Width = 2*padding + gap + 2*size
        // padding=0.1s, gap=0.04s => Width = 2.24s
        const gridSize = Math.floor(targetWidth / 2.24);
        const padding = Math.floor(gridSize * 0.1);
        const gap = Math.floor(gridSize * 0.04);
        const headerHeight = Math.floor(gridSize * 0.3);

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
            
            // Extract the sharp photo from that region
            const photoCanvas = document.createElement('canvas');
            photoCanvas.width = rect.w;
            photoCanvas.height = rect.h;
            const pCtx = photoCanvas.getContext('2d');
            if (!pCtx) return;
            
            pCtx.drawImage(canvas, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

            // Create blur effect on a temp canvas
            const blurCanvas = document.createElement('canvas');
            blurCanvas.width = rect.w;
            blurCanvas.height = rect.h;
            const bCtx = blurCanvas.getContext('2d');
            if (!bCtx) return;

            // Settings for the "Handheld" look
            const numCopies = 8; // More copies for smoother trail
            const blurAmount = gridSize * 0.012; // Reduced to 1.2% for subtlety (was 0.6% global, now local)
            // Randomize angle per photo for organic feel
            const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // +/- 22.5 deg

            bCtx.globalCompositeOperation = 'source-over';
            
            // Zoom slightly to hide edges when shaking
            const zoom = 1.05;
            const zw = rect.w * zoom;
            const zh = rect.h * zoom;
            const zx = (rect.w - zw) / 2;
            const zy = (rect.h - zh) / 2;
            
            for (let i = 0; i < numCopies; i++) {
                const ratio = i / (numCopies - 1); 
                // Offset centered around 0
                const offset = (ratio - 0.5) * blurAmount;
                const ox = offset * Math.cos(angle);
                const oy = offset * Math.sin(angle);
                
                // Soft ease-in-out opacity
                const alpha = 1.0 / (numCopies * 0.6); 

                bCtx.globalAlpha = alpha;
                bCtx.drawImage(photoCanvas, zx + ox, zy + oy, zw, zh);
            }
            
            // Apply the blurred result back to the main canvas
            // Clip to rect to preserve the clean grid borders
            ctx.save();
            ctx.beginPath();
            ctx.rect(rect.x, rect.y, rect.w, rect.h);
            ctx.clip();
            ctx.drawImage(blurCanvas, rect.x, rect.y, rect.w, rect.h);
            ctx.restore();

            // Re-stroke border to ensure crispness after potential bleed
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        });

        // --- STEP 2: DRAW CAPTION (Before filters) ---
        // Caption is drawn AFTER the blur, so the text remains sharp.
        if (caption && extraHeightForCaption > 0) {
             ctx.fillStyle = '#d4d4d4'; // Off-white
             ctx.font = `400 ${fontSize}px Inter, sans-serif`;
             ctx.textAlign = 'left';
             ctx.textBaseline = 'top';
             ctx.letterSpacing = '0.01em';

             const textStartX = captionPadding;
             const textStartY = targetHeight + (captionPadding * 0.5);
             const maxTextWidth = targetWidth - (captionPadding * 2);

             wrapText(ctx, caption, textStartX, textStartY, maxTextWidth, lineHeight);
             
             ctx.strokeStyle = '#333';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(captionPadding, targetHeight);
             ctx.lineTo(targetWidth - captionPadding, targetHeight);
             ctx.stroke();
        }

        // --- STEP 3: HIGH-END PORTRA LOOK ---
        
        // A. HALATION (Bloom)
        // Simulate film layer highlight spread.
        const halationCanvas = document.createElement('canvas');
        halationCanvas.width = canvas.width;
        halationCanvas.height = canvas.height;
        const hCtx = halationCanvas.getContext('2d');
        if (hCtx) {
            hCtx.drawImage(canvas, 0, 0);
            hCtx.filter = 'blur(10px)'; // Deep blur for glow
            hCtx.drawImage(halationCanvas, 0, 0); 
            
            // Composite Glow
            ctx.globalCompositeOperation = 'screen';
            ctx.globalAlpha = 0.2; // Subtle bloom intensity
            ctx.drawImage(halationCanvas, 0, 0);
            ctx.globalAlpha = 1.0;
        }

        // B. COLOR GRADING (Portra-esque)
        // 1. Warmth & Contrast (Overlay)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 230, 210, 0.15)'; // Golden warm overlay
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Shadows (Soft Light)
        // Push a tiny bit of teal into shadows for color separation
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(10, 20, 30, 0.15)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // C. FINE GRAIN (High Fidelity)
        ctx.globalCompositeOperation = 'overlay';
        
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = 256; // High res pattern
        grainCanvas.height = 256;
        const grainCtx = grainCanvas.getContext('2d');
        if (grainCtx) {
            const imageData = grainCtx.createImageData(256, 256);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                // Monochrome grain for cleaner look
                const val = 100 + Math.random() * 55; // Mid-grey noise
                data[i] = val;     // R
                data[i + 1] = val; // G
                data[i + 2] = val; // B
                data[i + 3] = 35;  // Subtle opacity
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
        
        // Reset composite
        ctx.globalCompositeOperation = 'source-over';

        resolve(canvas.toDataURL('image/jpeg', 0.90));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = base64Image;
  });
}