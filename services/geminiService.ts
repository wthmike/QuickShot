
import { FilterType } from '../types';

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
            const TARGET_SIZE = 800; 
            const resizedCanvases = await Promise.all(
                imgObjects.map(img => resizeImage(img, TARGET_SIZE))
            );

            // Layout Logic:
            // The grid is constructed based on the Tile Size (S).
            // Width = 2*S + Gap + 2*Padding.
            // P = 0.05 * S
            // G = 0.02 * S
            // Total Width Factor = 2 + 0.02 + 0.1 = 2.12
            
            const size = resizedCanvases[0].width; // S
            const padding = Math.floor(size * 0.05); // P
            const gap = Math.floor(size * 0.02);     // G
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error("No context"));
              return;
            }

            const gridWidth = (size * 2) + gap + (padding * 2);
            const gridHeight = (size * 2) + gap + (padding * 2);
            
            canvas.width = gridWidth;
            canvas.height = gridHeight;

            // 1. Background (Matte Black)
            ctx.fillStyle = '#0f0f11';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Draw Grid
            resizedCanvases.forEach((img, index) => {
                // Col: 0 or 1
                const col = index % 2;
                // Row: 0 or 1
                const row = Math.floor(index / 2);

                const x = padding + (col * (size + gap));
                const y = padding + (row * (size + gap));

                // Draw Image
                ctx.drawImage(img, x, y, size, size);
            });

            // COMPRESSION: Use WebP at 0.85 quality
            resolve(canvas.toDataURL('image/webp', 0.85));
        } catch (e) {
            reject(e);
        }
      })
      .catch(reject);
  });
}

// Helper to apply static blur to a specific region without moving pixels (no shaking)
function applyRegionBlur(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // 1. Copy the region to a temp canvas
    // ROUNDING is crucial here. If we draw at 0.5px, it will blur/shift the pixels.
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iw = Math.floor(w);
    const ih = Math.floor(h);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = iw;
    tempCanvas.height = ih;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;
    
    tCtx.drawImage(ctx.canvas, ix, iy, iw, ih, 0, 0, iw, ih);

    // 2. Draw it back onto the main canvas with a blur filter
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip(); // Ensure we don't effect neighboring pixels too much

    // REDUCED BLUR: Range 2 to 4.5px (Original was 3-6)
    const blurAmount = 2 + Math.random() * 2.5;
    ctx.filter = `blur(${blurAmount}px)`;
    
    // Draw exactly at same coordinates - NO SHIFT/SHAKE
    // We draw the tempCanvas (which is the captured region) back into the main canvas at x, y
    ctx.drawImage(tempCanvas, 0, 0, iw, ih, ix, iy, iw, ih);
    
    ctx.restore();
}

export async function processImageNatural(base64Image: string, filterType: FilterType = 'HIPPO_400'): Promise<{ combinedUrl: string, frames: string[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        // SAFETY: Downscale large images
        let targetWidth = img.width;
        let targetHeight = img.height;
        const MAX_WIDTH = 2000;

        if (targetWidth > MAX_WIDTH) {
            const scale = MAX_WIDTH / targetWidth;
            targetWidth = MAX_WIDTH;
            targetHeight = img.height * scale;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // --- STEP 1: BASE RENDER ---
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // --- CALC GEOMETRY (Percentage Based to fix Shaking) ---
        // Width = 2.12 units.
        // Size = 1.0 unit.
        // Padding = 0.05 unit.
        // Gap = 0.02 unit.
        // S_px = Width / 2.12
        
        const S = canvas.width / 2.12; 
        const uP = S * 0.05;
        const uG = S * 0.02;
        
        // We calculate these as floats, but will FLOOR them during extraction/blur
        const quadrants = [
            { x: uP, y: uP, w: S, h: S }, // Top Left
            { x: uP + S + uG, y: uP, w: S, h: S }, // Top Right
            { x: uP, y: uP + S + uG, w: S, h: S }, // Bottom Left
            { x: uP + S + uG, y: uP + S + uG, w: S, h: S } // Bottom Right
        ];

        // --- STEP 1.5: RANDOM REGION BLUR (No Shake) ---
        // We want to blur 2 random photos out of the 4 to create depth/focus shift in GIF.
        // Pick 2 distinct random indices to apply blur to
        const indices = [0, 1, 2, 3].sort(() => 0.5 - Math.random()).slice(0, 2);
        
        indices.forEach(idx => {
            const q = quadrants[idx];
            applyRegionBlur(ctx, q.x, q.y, q.w, q.h);
        });


        // --- STEP 2: APPLY FILTER LOOK ---
        // We take the current state (with blurs) and apply color grading.
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');
        
        if (tCtx) {
            // Copy current state to temp
            tCtx.drawImage(canvas, 0, 0);
            
            // Prepare main canvas for filtered draw
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            let overlayColor: string | null = null;
            let overlayMode: GlobalCompositeOperation = 'source-over';

            // Filter Configuration
            if (filterType === 'HIPPO_400') {
                // COLOR 1: NATURAL / RICH
                ctx.filter = 'contrast(1.08) saturate(1.15) brightness(1.02)';
                overlayMode = 'screen';
                overlayColor = 'rgba(20, 30, 40, 0.05)'; 

            } else if (filterType === 'HIPPO_800') {
                // COLOR 2: WARMER / HIGHER ISO FEEL
                ctx.filter = 'contrast(1.1) saturate(1.2) brightness(1.05) sepia(0.15)';
                overlayMode = 'overlay';
                overlayColor = 'rgba(255, 200, 150, 0.08)'; 

            } else if (filterType === 'WILLIAM_400') {
                // B&W 1: WILLIAM STANDARD MONO
                ctx.filter = 'grayscale(100%) contrast(1.1) brightness(1.0)';
                // No overlay color for B&W to prevent tinting
                overlayColor = null;

            } else if (filterType === 'WILLIAM_H') {
                // B&W 2: WILLIAM HIGH CONTRAST
                ctx.filter = 'grayscale(100%) contrast(1.45) brightness(1.1)';
                overlayColor = null;
            } else {
                ctx.filter = 'none';
            }

            // Execute Filtered Draw
            ctx.drawImage(tempCanvas, 0, 0);
            
            // Reset Filter
            ctx.filter = 'none';

            // Apply Tint/Overlay if needed (Only for color films)
            if (overlayColor) {
                ctx.globalCompositeOperation = overlayMode;
                ctx.fillStyle = overlayColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.restore();
        }

        // --- STEP 3: GRAIN ---
        // Grain can be applied to both color and B&W.
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = 128; 
        grainCanvas.height = 128;
        const grainCtx = grainCanvas.getContext('2d');
        if (grainCtx) {
            const imageData = grainCtx.createImageData(128, 128);
            const data = imageData.data;
            
            // Grain Logic based on ISO/Type
            let grainIntensity = 30;
            let grainOpacity = 30;

            if (filterType === 'HIPPO_800') {
                grainIntensity = 45;
                grainOpacity = 40;
            } else if (filterType === 'WILLIAM_400') {
                grainIntensity = 50; 
                grainOpacity = 50;
            } else if (filterType === 'WILLIAM_H') {
                grainIntensity = 60; 
                grainOpacity = 60;
            }

            for (let i = 0; i < data.length; i += 4) {
                // Monochromatic grain
                const val = 120 + Math.random() * grainIntensity; 
                data[i] = val;     
                data[i + 1] = val; 
                data[i + 2] = val; 
                data[i + 3] = grainOpacity; 
            }
            grainCtx.putImageData(imageData, 0, 0);
            
            const pattern = ctx.createPattern(grainCanvas, 'repeat');
            if (pattern) {
                ctx.save();
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = pattern;
                ctx.globalAlpha = 0.6; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }

        // --- STEP 4: GLOW (Bloom) ---
        // Only for color or mild B&W, disable for High Contrast B&W to keep it sharp
        if (filterType !== 'WILLIAM_H') {
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = canvas.width / 2;
            glowCanvas.height = canvas.height / 2;
            const gCtx = glowCanvas.getContext('2d');
            if (gCtx) {
                gCtx.filter = 'blur(4px) brightness(1.2)';
                gCtx.globalAlpha = 0.2; 
                gCtx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
                
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.drawImage(glowCanvas, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }

        // --- STEP 5: FINAL B&W ENFORCEMENT ---
        // We do this absolutely last to ensure NO color leaks from Glow, Overlay, or Grain.
        const isBW = filterType.includes('WILLIAM');
        
        if (isBW) {
            const postProcessSnapshot = document.createElement('canvas');
            postProcessSnapshot.width = canvas.width;
            postProcessSnapshot.height = canvas.height;
            const ppCtx = postProcessSnapshot.getContext('2d');
            
            if (ppCtx) {
                ppCtx.drawImage(canvas, 0, 0);
                
                ctx.save();
                ctx.globalCompositeOperation = 'source-over';
                ctx.filter = 'grayscale(100%)'; // Hard enforce
                ctx.drawImage(postProcessSnapshot, 0, 0);
                ctx.restore();
            }
        }

        // --- STEP 6: EXTRACT FRAMES ---
        // Extracting frames from the FINAL processed image
        const processedFrames: string[] = [];
        
        for (const q of quadrants) {
            // FLOORING coordinates to align pixels prevents shaking in GIF
            const x = Math.floor(q.x);
            const y = Math.floor(q.y);
            const w = Math.floor(q.w);
            const h = Math.floor(q.h);

            const tempC = document.createElement('canvas');
            tempC.width = w;
            tempC.height = h;
            const tempCtx = tempC.getContext('2d');
            if (tempCtx) {
                // Safety: Re-apply grayscale here to guard against extraction quirks
                if (isBW) {
                    tempCtx.filter = 'grayscale(100%)';
                }
                tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
                processedFrames.push(tempC.toDataURL('image/webp', 0.85));
            }
        }

        resolve({
            combinedUrl: canvas.toDataURL('image/webp', 0.90),
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
