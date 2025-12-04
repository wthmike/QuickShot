
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

// ROBUST BLUR: Uses downscaling/upscaling to create a blur effect.
// This works on ALL browsers/devices, whereas ctx.filter('blur') can fail on some mobile webviews.
function applyRegionBlur(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iw = Math.floor(w);
    const ih = Math.floor(h);

    if (iw < 1 || ih < 1) return;

    // 1. Downscale significantly (smaller = blurrier when scaled up)
    const scale = 0.15; // 15% original size
    const sw = Math.max(2, Math.floor(iw * scale));
    const sh = Math.max(2, Math.floor(ih * scale));

    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = sw;
    smallCanvas.height = sh;
    const sCtx = smallCanvas.getContext('2d');
    if (!sCtx) return;
    
    // Draw source region into small canvas (Resampling creates blur)
    sCtx.drawImage(ctx.canvas, ix, iy, iw, ih, 0, 0, sw, sh);

    // 2. Draw back scaled up
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix, iy, iw, ih);
    ctx.clip(); 

    // Draw scaled up (Browser's bicubic interpolation creates the smooth blur)
    ctx.drawImage(smallCanvas, 0, 0, sw, sh, ix, iy, iw, ih);
    
    ctx.restore();
}

// ROBUST GRAYSCALE: Manipulates pixels directly.
// Ensures B&W works even if ctx.filter is ignored by the browser.
function applyRobustGrayscaleAndContrast(ctx: CanvasRenderingContext2D, width: number, height: number, contrast: number = 1.0) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        // Luminosity method for natural grayscale
        let avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        
        // Apply Contrast
        // Formula approximation: val = (val - 128) * contrast + 128
        if (contrast !== 1.0) {
            avg = (avg - 128) * contrast + 128;
            if (avg < 0) avg = 0;
            if (avg > 255) avg = 255;
        }

        data[i] = avg;     // R
        data[i + 1] = avg; // G
        data[i + 2] = avg; // B
        // Alpha unchanged
    }
    ctx.putImageData(imageData, 0, 0);
}

export async function processImageNatural(base64Image: string, filterType: FilterType = 'HIPPO_400'): Promise<{ combinedUrl: string, frames: string[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        // SAFETY: Downscale large images
        // Reduced to 1600 for better mobile memory stability
        let targetWidth = img.width;
        let targetHeight = img.height;
        const MAX_WIDTH = 1600; 

        if (targetWidth > MAX_WIDTH) {
            const scale = MAX_WIDTH / targetWidth;
            targetWidth = MAX_WIDTH;
            targetHeight = img.height * scale;
        }

        const canvas = document.createElement('canvas');
        // Removed { willReadFrequently: true } to avoid interfering with GPU operations on mobile
        const ctx = canvas.getContext('2d');
        
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
        
        const S = canvas.width / 2.12; 
        const uP = S * 0.05;
        const uG = S * 0.02;
        
        const quadrants = [
            { x: uP, y: uP, w: S, h: S }, // Top Left
            { x: uP + S + uG, y: uP, w: S, h: S }, // Top Right
            { x: uP, y: uP + S + uG, w: S, h: S }, // Bottom Left
            { x: uP + S + uG, y: uP + S + uG, w: S, h: S } // Bottom Right
        ];

        // --- STEP 1.5: RANDOM REGION BLUR ---
        // We use the Robust Downscale method now.
        const indices = [0, 1, 2, 3].sort(() => 0.5 - Math.random()).slice(0, 2);
        
        indices.forEach(idx => {
            const q = quadrants[idx];
            applyRegionBlur(ctx, q.x, q.y, q.w, q.h);
        });

        // --- STEP 2: APPLY FILTER LOOK (Color / Initial Grading) ---
        // We try to use ctx.filter for color grading. 
        // If it fails on mobile, the B&W step later will still save the day for Mono.
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');
        
        if (tCtx) {
            tCtx.drawImage(canvas, 0, 0);
            
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            let overlayColor: string | null = null;
            let overlayMode: GlobalCompositeOperation = 'source-over';

            // Filter Configuration
            if (filterType === 'HIPPO_400') {
                ctx.filter = 'contrast(1.08) saturate(1.15) brightness(1.02)';
                overlayMode = 'screen';
                overlayColor = 'rgba(20, 30, 40, 0.05)'; 

            } else if (filterType === 'HIPPO_800') {
                ctx.filter = 'contrast(1.1) saturate(1.2) brightness(1.05) sepia(0.15)';
                overlayMode = 'overlay';
                overlayColor = 'rgba(255, 200, 150, 0.08)'; 

            } else if (filterType === 'WILLIAM_400') {
                // Initial contrast prep
                ctx.filter = 'contrast(1.1) brightness(1.0)';
                overlayColor = null;

            } else if (filterType === 'WILLIAM_H') {
                // Initial contrast prep
                ctx.filter = 'contrast(1.2) brightness(1.1)';
                overlayColor = null;
            } else {
                ctx.filter = 'none';
            }

            // Execute Filtered Draw
            ctx.drawImage(tempCanvas, 0, 0);
            
            ctx.filter = 'none';

            // Apply Tint/Overlay
            if (overlayColor) {
                ctx.globalCompositeOperation = overlayMode;
                ctx.fillStyle = overlayColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.restore();
        }

        // --- STEP 3: GRAIN ---
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = 128; 
        grainCanvas.height = 128;
        const grainCtx = grainCanvas.getContext('2d');
        if (grainCtx) {
            const imageData = grainCtx.createImageData(128, 128);
            const data = imageData.data;
            
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

        // --- STEP 4: GLOW (Optional) ---
        // We skip Glow for WILLIAM_H to keep it sharp.
        // For others, we try it. 
        if (filterType !== 'WILLIAM_H') {
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = canvas.width / 4; // Smaller for more blur + performance
            glowCanvas.height = canvas.height / 4;
            const gCtx = glowCanvas.getContext('2d');
            if (gCtx) {
                // We just draw scaled down, no filter needed for "glowy" look when scaled up
                gCtx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
                
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.25; 
                // Draw scaled up for soft glow
                ctx.drawImage(glowCanvas, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }

        // --- STEP 5: ROBUST B&W ENFORCEMENT ---
        // This is the critical fix for "Black and white is still color".
        // We use pixel manipulation to guarantee the result.
        
        if (filterType === 'WILLIAM_400') {
            applyRobustGrayscaleAndContrast(ctx, canvas.width, canvas.height, 1.0);
        } else if (filterType === 'WILLIAM_H') {
            applyRobustGrayscaleAndContrast(ctx, canvas.width, canvas.height, 1.25); // Higher contrast
        }

        // --- STEP 6: EXTRACT FRAMES ---
        const processedFrames: string[] = [];
        const isBW = filterType.includes('WILLIAM');
        
        for (const q of quadrants) {
            const x = Math.floor(q.x);
            const y = Math.floor(q.y);
            const w = Math.floor(q.w);
            const h = Math.floor(q.h);

            const tempC = document.createElement('canvas');
            tempC.width = w;
            tempC.height = h;
            const tempCtx = tempC.getContext('2d');
            if (tempCtx) {
                tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
                
                // Double Safety for extraction on mobile
                if (isBW) {
                     applyRobustGrayscaleAndContrast(tempCtx, w, h, 1.0);
                }

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
