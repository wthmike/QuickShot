
import { FilterType, User } from '../types';

// Utility to resize images to avoid OOM crashes on mobile
async function resizeImage(img: HTMLImageElement, maxWidth: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    let scale = 1;
    if (img.width > maxWidth) {
        scale = maxWidth / img.width;
    }
    
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
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
            // SAFETY: High Quality Resize
            const TARGET_SIZE = 1600; 
            const resizedCanvases = await Promise.all(
                imgObjects.map(img => resizeImage(img, TARGET_SIZE))
            );

            // Layout Logic:
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
                const col = index % 2;
                const row = Math.floor(index / 2);
                const x = padding + (col * (size + gap));
                const y = padding + (row * (size + gap));
                ctx.drawImage(img, x, y, size, size);
            });

            // COMPRESSION: Use WebP at High Quality
            resolve(canvas.toDataURL('image/webp', 0.98));
        } catch (e) {
            reject(e);
        }
      })
      .catch(reject);
  });
}

// ROBUST BLUR: Uses a Gaussian blur filter for a subtle focus slip.
function applyRegionBlur(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    if (w < 1 || h < 1) return;

    // Create a temporary canvas to hold the region
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    // Draw the source region into the temp canvas
    tCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);

    ctx.save();
    
    // Subtle blur radius.
    // 0.6% of width simulates a slight lens slip/missed focus.
    const blurRadius = Math.max(3, Math.floor(w * 0.006)); 
    ctx.filter = `blur(${blurRadius}px)`;

    // Clip to ensure blur doesn't bleed outside the quadrant too much
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    // Draw the temp canvas back onto the main canvas
    ctx.drawImage(tempCanvas, x, y, w, h);

    ctx.restore();
}

// ROBUST GRAYSCALE
function applyRobustGrayscaleAndContrast(ctx: CanvasRenderingContext2D, width: number, height: number, contrast: number = 1.0) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        let avg = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        if (contrast !== 1.0) {
            avg = (avg - 128) * contrast + 128;
            if (avg < 0) avg = 0;
            if (avg > 255) avg = 255;
        }
        data[i] = avg;     
        data[i + 1] = avg; 
        data[i + 2] = avg; 
    }
    ctx.putImageData(imageData, 0, 0);
}

export async function processImageNatural(base64Image: string, filterType: FilterType = 'HIPPO_400'): Promise<{ combinedUrl: string, frames: string[] }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        let targetWidth = img.width;
        let targetHeight = img.height;
        const MAX_WIDTH = 3200; 

        if (targetWidth > MAX_WIDTH) {
            const scale = MAX_WIDTH / targetWidth;
            targetWidth = MAX_WIDTH;
            targetHeight = img.height * scale;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // --- STEP 1: BASE RENDER ---
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // --- CALC GEOMETRY ---
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
        // Subtly blur 2 random quadrants (simulate focus slip)
        const indices = [0, 1, 2, 3].sort(() => 0.5 - Math.random()).slice(0, 2);
        indices.forEach(idx => {
            const q = quadrants[idx];
            applyRegionBlur(ctx, q.x, q.y, q.w, q.h);
        });

        // --- STEP 2: APPLY FILTER LOOK ---
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

            if (filterType === 'HIPPO_400') {
                ctx.filter = 'contrast(1.08) saturate(1.15) brightness(1.02)';
                overlayMode = 'screen';
                overlayColor = 'rgba(20, 30, 40, 0.05)'; 

            } else if (filterType === 'HIPPO_800') {
                ctx.filter = 'contrast(1.1) saturate(1.2) brightness(1.05) sepia(0.15)';
                overlayMode = 'overlay';
                overlayColor = 'rgba(255, 200, 150, 0.08)'; 

            } else if (filterType === 'WILLIAM_400') {
                ctx.filter = 'contrast(1.1) brightness(1.0)';
                overlayColor = null;

            } else if (filterType === 'WILLIAM_H') {
                ctx.filter = 'contrast(1.2) brightness(1.1)';
                overlayColor = null;
            } else {
                ctx.filter = 'none';
            }

            ctx.drawImage(tempCanvas, 0, 0);
            ctx.filter = 'none';

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

        // --- STEP 4: GLOW ---
        if (filterType !== 'WILLIAM_H') {
            const glowCanvas = document.createElement('canvas');
            glowCanvas.width = canvas.width / 4; 
            glowCanvas.height = canvas.height / 4;
            const gCtx = glowCanvas.getContext('2d');
            if (gCtx) {
                gCtx.drawImage(canvas, 0, 0, glowCanvas.width, glowCanvas.height);
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                ctx.globalAlpha = 0.25; 
                ctx.drawImage(glowCanvas, 0, 0, canvas.width, canvas.height);
                ctx.restore();
            }
        }

        // --- STEP 5: ROBUST B&W ENFORCEMENT ---
        if (filterType === 'WILLIAM_400') {
            applyRobustGrayscaleAndContrast(ctx, canvas.width, canvas.height, 1.0);
        } else if (filterType === 'WILLIAM_H') {
            applyRobustGrayscaleAndContrast(ctx, canvas.width, canvas.height, 1.25); 
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
                tempCtx.imageSmoothingEnabled = true;
                tempCtx.imageSmoothingQuality = 'high';

                tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
                
                if (isBW) {
                     applyRobustGrayscaleAndContrast(tempCtx, w, h, 1.0);
                }

                processedFrames.push(tempC.toDataURL('image/webp', 0.98));
            }
        }

        resolve({
            combinedUrl: canvas.toDataURL('image/jpeg', 0.98),
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

// CONSTANTS FOR POSTER GEOMETRY (Shared with Motion Generator)
// DESIGN: Dark Swiss Editorial
// Image is pushed down to make room for massive typography.
const POSTER_WIDTH = 2400;
const POSTER_HEIGHT = 3600;
const POSTER_MARGIN = 140; 
const IMG_Y = 960; 
const IMG_SIZE = 2120; // 2400 - (140 * 2)

export async function createPoster(
    imageUrl: string, 
    locationName: string, 
    dateString: string, 
    filterName: string,
    coordinates: string = ""
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = POSTER_WIDTH;
            canvas.height = POSTER_HEIGHT;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error("No context"));
                return;
            }

            // 1. Background (Dark Swiss - Deep Black)
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Header Typography (Editorial)
            // Top Left: Coordinates / Label
            ctx.fillStyle = '#666';
            ctx.font = '500 60px "DM Sans", sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('HIPPOCAM // OPTICAL', POSTER_MARGIN, 150);

            // Top Right: Date
            ctx.textAlign = 'right';
            ctx.fillText(dateString.toUpperCase(), POSTER_WIDTH - POSTER_MARGIN, 150);

            // Massive Location Title
            const cleanLoc = locationName.toUpperCase().split(',')[0];
            ctx.textAlign = 'left';
            ctx.fillStyle = '#EAEAEA';
            
            // Dynamic sizing for title
            let titleSize = 350;
            ctx.font = `bold ${titleSize}px "DM Sans", sans-serif`;
            while (ctx.measureText(cleanLoc).width > (POSTER_WIDTH - POSTER_MARGIN * 2) && titleSize > 120) {
                titleSize -= 20;
                ctx.font = `bold ${titleSize}px "DM Sans", sans-serif`;
            }
            
            // Draw Title baseline just above image
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(cleanLoc, POSTER_MARGIN, IMG_Y - 60);

            // 3. Image (Middle)
            ctx.drawImage(img, POSTER_MARGIN, IMG_Y, IMG_SIZE, IMG_SIZE);

            // 4. Footer / Technical Grid
            const FOOTER_START_Y = IMG_Y + IMG_SIZE + 120;
            
            // Divider Line
            ctx.fillStyle = '#333';
            ctx.fillRect(POSTER_MARGIN, FOOTER_START_Y, POSTER_WIDTH - (POSTER_MARGIN * 2), 4);

            const INFO_Y = FOOTER_START_Y + 100;
            ctx.textBaseline = 'top';
            
            // Column 1: Filter
            ctx.font = 'bold 80px "DM Sans", sans-serif';
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'left';
            ctx.fillText(filterName.toUpperCase(), POSTER_MARGIN, INFO_Y);
            
            ctx.font = '500 50px "DM Sans", sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText('EMULSION PROCESS', POSTER_MARGIN, INFO_Y + 100);

            // Column 2: Coords (Right Aligned)
            ctx.textAlign = 'right';
            ctx.font = 'bold 80px "DM Sans", sans-serif';
            ctx.fillStyle = '#FFF';
            ctx.fillText(coordinates || 'NO DATA', POSTER_WIDTH - POSTER_MARGIN, INFO_Y);
            
            ctx.font = '500 50px "DM Sans", sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText('GEOLOCATION', POSTER_WIDTH - POSTER_MARGIN, INFO_Y + 100);

            resolve(canvas.toDataURL('image/jpeg', 0.95));
        };
        img.onerror = (e) => reject(e);
        img.src = imageUrl;
    });
}

// GENERATE ANIMATED POSTER BLOB (WebM)
export async function createMotionPoster(posterUrl: string, frames: string[]): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const posterImg = new Image();
        posterImg.crossOrigin = "Anonymous";
        
        posterImg.onload = async () => {
             // Prepare Frames
             const loadedFrames = await Promise.all(frames.map(src => {
                 return new Promise<HTMLImageElement>((r, e) => {
                     const i = new Image();
                     i.crossOrigin = "Anonymous";
                     i.onload = () => r(i);
                     i.onerror = e;
                     i.src = src;
                 });
             }));

             const canvas = document.createElement('canvas');
             canvas.width = POSTER_WIDTH;
             canvas.height = POSTER_HEIGHT;
             const ctx = canvas.getContext('2d');
             if(!ctx) return reject("No ctx");

             // Setup MediaRecorder
             const stream = canvas.captureStream(30); // 30 FPS
             const recorder = new MediaRecorder(stream, {
                 mimeType: 'video/webm;codecs=vp9',
                 videoBitsPerSecond: 5000000 // 5 Mbps
             });

             const chunks: Blob[] = [];
             recorder.ondataavailable = (e) => {
                 if (e.data.size > 0) chunks.push(e.data);
             };
             recorder.onstop = () => {
                 const blob = new Blob(chunks, { type: 'video/webm' });
                 resolve(blob);
             };

             recorder.start();

             // ANIMATION LOOP
             const FRAME_DURATION = 150; // ms
             const TOTAL_LOOPS = 4;
             
             let loopCount = 0;
             let frameIdx = 0;

             const draw = () => {
                 // 1. Draw Poster Base
                 ctx.drawImage(posterImg, 0, 0);
                 
                 // 2. Draw Current Frame in the Image Slot
                 // NOTE: Must match geometry in createPoster
                 ctx.drawImage(loadedFrames[frameIdx], POSTER_MARGIN, IMG_Y, IMG_SIZE, IMG_SIZE);

                 // Advance
                 frameIdx++;
                 if (frameIdx >= loadedFrames.length) {
                     frameIdx = 0;
                     loopCount++;
                 }

                 if (loopCount < TOTAL_LOOPS) {
                     setTimeout(draw, FRAME_DURATION); 
                 } else {
                     recorder.stop();
                 }
             };

             draw();
        };
        posterImg.onerror = reject;
        posterImg.src = posterUrl;
    });
}
