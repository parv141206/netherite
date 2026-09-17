/**
 * Image optimization utilities to automatically compress and downscale
 * large base64 images embedded in Excalidraw documents and Markdown notes.
 */

export async function optimizeBase64Image(
  dataUrl: string,
  maxDimension = 1600,
  quality = 0.82
): Promise<string> {
  if (typeof window === "undefined") return dataUrl;
  if (!dataUrl || typeof dataUrl !== "string") return dataUrl;

  // Only optimize raster images (skip SVG, icons, or non-image data URLs)
  if (!dataUrl.startsWith("data:image/") || dataUrl.startsWith("data:image/svg+xml")) {
    return dataUrl;
  }

  // Only optimize if substantial size (> 80 KB base64, ~60 KB binary)
  if (dataUrl.length < 80 * 1024) {
    return dataUrl;
  }

  return new Promise<string>((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const timeoutId = window.setTimeout(() => {
        resolve(dataUrl);
      }, 5000);

      img.onload = () => {
        window.clearTimeout(timeoutId);
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          if (!originalWidth || !originalHeight) {
            resolve(dataUrl);
            return;
          }

          let width = originalWidth;
          let height = originalHeight;

          // Scale down if either dimension exceeds maxDimension
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Try modern WebP first (best compression for diagrams & screenshots)
          try {
            const webpUrl = canvas.toDataURL("image/webp", quality);
            if (webpUrl.startsWith("data:image/webp") && webpUrl.length < dataUrl.length) {
              resolve(webpUrl);
              return;
            }
          } catch {}

          // Fallback to JPEG
          try {
            const jpegUrl = canvas.toDataURL("image/jpeg", quality);
            if (jpegUrl.startsWith("data:image/jpeg") && jpegUrl.length < dataUrl.length) {
              resolve(jpegUrl);
              return;
            }
          } catch {}

          // If conversion wasn't smaller or failed, preserve original
          resolve(dataUrl);
        } catch (err) {
          console.warn("Canvas image optimization error:", err);
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        window.clearTimeout(timeoutId);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

export interface OptimizationResult {
  content: string;
  wasOptimized: boolean;
  originalSize: number;
  optimizedSize: number;
}

interface ExcalidrawFileEntry {
  id?: string;
  dataURL?: string;
  mimeType?: string;
  created?: number;
  lastRetrieved?: number;
}

interface ExcalidrawDoc {
  elements?: unknown[];
  appState?: Record<string, unknown>;
  files?: Record<string, ExcalidrawFileEntry>;
  [key: string]: unknown;
}

/**
 * Optimizes all base64 images inside an Excalidraw JSON string.
 */
export async function optimizeExcalidrawJson(jsonStr: string): Promise<OptimizationResult> {
  const originalSize = jsonStr.length;
  if (!jsonStr || typeof jsonStr !== "string") {
    return { content: jsonStr, wasOptimized: false, originalSize, optimizedSize: originalSize };
  }

  // Quick check: does it look like Excalidraw JSON with files?
  if (!jsonStr.includes('"files"') || !jsonStr.includes("data:image/")) {
    return { content: jsonStr, wasOptimized: false, originalSize, optimizedSize: originalSize };
  }

  try {
    const data = JSON.parse(jsonStr) as ExcalidrawDoc;
    if (!data || typeof data !== "object" || !data.files || typeof data.files !== "object") {
      return { content: jsonStr, wasOptimized: false, originalSize, optimizedSize: originalSize };
    }

    const files = data.files;
    const fileKeys = Object.keys(files);
    if (fileKeys.length === 0) {
      return { content: jsonStr, wasOptimized: false, originalSize, optimizedSize: originalSize };
    }

    let wasOptimized = false;

    // Process all images in parallel
    await Promise.all(
      fileKeys.map(async (key) => {
        const fileObj = files[key];
        if (
          fileObj?.dataURL &&
          typeof fileObj.dataURL === "string" &&
          fileObj.dataURL.startsWith("data:image/")
        ) {
          const originalLen = fileObj.dataURL.length;
          const optimized = await optimizeBase64Image(fileObj.dataURL, 1600, 0.82);

          if (optimized.length < originalLen) {
            fileObj.dataURL = optimized;
            if (optimized.startsWith("data:image/webp")) {
              fileObj.mimeType = "image/webp";
            } else if (optimized.startsWith("data:image/jpeg")) {
              fileObj.mimeType = "image/jpeg";
            }
            wasOptimized = true;
          }
        }
      })
    );

    if (wasOptimized) {
      const optimizedContent = JSON.stringify(data);
      return {
        content: optimizedContent,
        wasOptimized: true,
        originalSize,
        optimizedSize: optimizedContent.length,
      };
    }

    return { content: jsonStr, wasOptimized: false, originalSize, optimizedSize: originalSize };
  } catch (err) {
    console.warn("optimizeExcalidrawJson parsing error:", err);
    return { content: jsonStr, wasOptimized: false, originalSize, optimizedSize: originalSize };
  }
}

/**
 * Optimizes all embedded base64 images inside Markdown / HTML content.
 */
export async function optimizeMarkdownImages(content: string): Promise<OptimizationResult> {
  const originalSize = content.length;
  if (!content || typeof content !== "string" || !content.includes("data:image/")) {
    return { content, wasOptimized: false, originalSize, optimizedSize: originalSize };
  }

  const base64Regex = /data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=]+/g;
  const matches = content.match(base64Regex);
  if (!matches || matches.length === 0) {
    return { content, wasOptimized: false, originalSize, optimizedSize: originalSize };
  }

  const uniqueMatches = Array.from(new Set(matches));
  let updatedContent = content;
  let wasOptimized = false;

  await Promise.all(
    uniqueMatches.map(async (dataUrl) => {
      if (dataUrl.length > 80 * 1024) {
        const optimized = await optimizeBase64Image(dataUrl, 1600, 0.82);
        if (optimized.length < dataUrl.length) {
          updatedContent = updatedContent.replaceAll(dataUrl, optimized);
          wasOptimized = true;
        }
      }
    })
  );

  return {
    content: updatedContent,
    wasOptimized,
    originalSize,
    optimizedSize: updatedContent.length,
  };
}
