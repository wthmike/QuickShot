
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

            const size = resizedCanvases[0].width; // Assuming square
            
            // Dynamic Layout: 2x2 Grid (Clean)
            const padding = Math.floor(size * 0.05); // Small outer matte
            const gap = Math.floor(size * 0.02);     // Tiny gap between grid items
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              reject(new Error("No context"));
              return;
            }

            // Width: Padding + Image + Gap + Image + Padding
            const gridWidth = (size * 2) + gap + (padding * 2);
            // Height: Same (Square output)
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

// Helper to apply directional motion blur to a specific region
function applyMotionBlur(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    // To simulate motion blur we draw the region multiple times with opacity and offset
    const steps = 6; // Reduced steps for performance
    const distance = 8 + Math.random() * 8; // Subtle blur
    const angle = (Math.random() - 0.5) * Math.PI; // Random angle between -90 and 90

    // Capture the region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;
    
    tCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);

    // Apply blur to the region on the main canvas
    ctx.save();
    // Clip to the region so we don't blur over borders
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.globalAlpha = 0.25; // Higher opacity, fewer steps = sharper blur
    
    // Draw multiple times shifted
    for (let i = 0; i < steps; i++) {
        const progress = (i / (steps - 1)) - 0.5; // -0.5 to 0.5
        const offsetX = Math.cos(angle) * distance * progress;
        const offsetY = Math.sin(angle) * distance * progress;
        
        ctx.drawImage(tempCanvas, 0, 0, w, h, x + offsetX, y + offsetY, w, h);
    }
    
    ctx.restore();
}

export async function processImageNatural(base64Image: string): Promise<{ combinedUrl: string, frames: string[] }> {
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

        // --- STEP 1.5: RANDOM MOTION BLUR ---
        // We want to blur 2 random photos out of the 4.
        const padding = canvas.width * 0.05;
        const gap = canvas.width * 0.02;
        const cellSize = (canvas.width - (padding * 2) - gap) / 2;
        
        const quadrants = [
            { x: padding, y: padding, w: cellSize, h: cellSize }, // Top Left
            { x: padding + cellSize + gap, y: padding, w: cellSize, h: cellSize }, // Top Right
            { x: padding, y: padding + cellSize + gap, w: cellSize, h: cellSize }, // Bottom Left
            { x: padding + cellSize + gap, y: padding + cellSize + gap, w: cellSize, h: cellSize } // Bottom Right
        ];

        // Pick 2 distinct random indices
        const indices = [0, 1, 2, 3].sort(() => 0.5 - Math.random()).slice(0, 2);
        
        indices.forEach(idx => {
            const q = quadrants[idx];
            applyMotionBlur(ctx, q.x, q.y, q.w, q.h);
        });


        // --- STEP 2: HIGH-END REALISTIC FILM LOOK ---
        // Goal: Natural color science, micro-contrast, no heavy tinting.

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tCtx = tempCanvas.getContext('2d');
        if (tCtx) {
            // 1. Primary Curve Adjustment (S-Curve simulation)
            // Slight contrast boost, very subtle saturation boost.
            // We do NOT want to wash it out. We want it crisp.
            tCtx.filter = 'contrast(1.08) saturate(1.15) brightness(1.02)';
            tCtx.drawImage(canvas, 0, 0);
            ctx.drawImage(tempCanvas, 0, 0);
        }

        // 2. Subtle Warmth (Not Orange)
        // Mimics daylight balanced film.
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 240, 220, 0.08)'; // Very subtle warm white
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 3. Shadow Density (Rich Blacks)
        // Instead of blue/teal shadows, we just darken them slightly to mimic good D-Max.
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(10, 10, 12, 0.1)'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 4. Fine Organic Grain (ISO 200/400 style)
        // Very subtle, just enough to break digital banding.
        ctx.globalCompositeOperation = 'overlay';
        const grainCanvas = document.createElement('canvas');
        grainCanvas.width = 128; 
        grainCanvas.height = 128;
        const grainCtx = grainCanvas.getContext('2d');
        if (grainCtx) {
            const imageData = grainCtx.createImageData(128, 128);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const val = 120 + Math.random() * 30; // Much tighter range = finer grain
                data[i] = val;     
                data[i + 1] = val; 
                data[i + 2] = val; 
                data[i + 3] = 30; // Lower opacity
            }
            grainCtx.putImageData(imageData, 0, 0);
            
            const pattern = ctx.createPattern(grainCanvas, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.globalAlpha = 0.6; 
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalAlpha = 1.0;
            }
        }

        // 5. Optical Softness (Very slight glow on brights)
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = canvas.width / 2;
        glowCanvas.height = canvas.height / 2;
        const gCtx = glowCanvas.getContext('2d');
        if (gCtx) {
            gCtx.filter = 'blur(4px) brightness(1.2)';
            gCtx.globalAlpha = 0.2; // Very subtle
            gCtx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
            
            ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(glowCanvas, 0, 0, canvas.width, canvas.height);
        }

        // Reset
        ctx.globalCompositeOperation = 'source-over';

        // --- STEP 3: EXTRACT FRAMES ---
        const processedFrames: string[] = [];
        for (const q of quadrants) {
            const tempC = document.createElement('canvas');
            tempC.width = q.w;
            tempC.height = q.h;
            const tempCtx = tempC.getContext('2d');
            if (tempCtx) {
                tempCtx.drawImage(canvas, q.x, q.y, q.w, q.h, 0, 0, q.w, q.h);
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
