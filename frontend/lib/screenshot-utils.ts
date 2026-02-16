/**
 * Screenshot Capture Utilities
 * Uses html2canvas to capture page screenshots for bug reports
 */

import html2canvas from 'html2canvas';
import { formatFileSize } from '@/lib/utils';

export interface ScreenshotOptions {
  quality?: number; // 0-1, default 0.8
  maxWidth?: number; // pixels, default 1920
  maxHeight?: number; // pixels, default 1080
  format?: 'png' | 'jpeg'; // default 'png'
}

export interface ScreenshotResult {
  dataUrl: string;
  blob: Blob;
  size: number; // bytes
  width: number;
  height: number;
}

/**
 * Capture screenshot of current viewport
 */
export async function captureScreenshot(
  element: HTMLElement = document.body,
  options: ScreenshotOptions = {}
): Promise<ScreenshotResult> {
  const {
    quality = 0.8,
    maxWidth = 1920,
    maxHeight = 1080,
    format = 'png',
  } = options;

  try {
    // Capture canvas
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      scale: 1, // Use device pixel ratio for better quality
      logging: false,
      windowWidth: Math.min(window.innerWidth, maxWidth),
      windowHeight: Math.min(window.innerHeight, maxHeight),
    });

    // Resize if needed
    let finalCanvas = canvas;
    if (canvas.width > maxWidth || canvas.height > maxHeight) {
      finalCanvas = resizeCanvas(canvas, maxWidth, maxHeight);
    }

    // Convert to blob and data URL
    const blob = await new Promise<Blob>((resolve, reject) => {
      finalCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create blob'));
        },
        `image/${format}`,
        quality
      );
    });

    const dataUrl = finalCanvas.toDataURL(`image/${format}`, quality);

    return {
      dataUrl,
      blob,
      size: blob.size,
      width: finalCanvas.width,
      height: finalCanvas.height,
    };
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    throw new Error('Failed to capture screenshot');
  }
}

/**
 * Resize canvas to fit within max dimensions while maintaining aspect ratio
 */
function resizeCanvas(
  sourceCanvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement {
  const { width: srcWidth, height: srcHeight } = sourceCanvas;

  // Calculate scaling factor
  const widthRatio = maxWidth / srcWidth;
  const heightRatio = maxHeight / srcHeight;
  const scale = Math.min(widthRatio, heightRatio, 1);

  const targetWidth = Math.floor(srcWidth * scale);
  const targetHeight = Math.floor(srcHeight * scale);

  // Create resized canvas
  const resizedCanvas = document.createElement('canvas');
  resizedCanvas.width = targetWidth;
  resizedCanvas.height = targetHeight;

  const ctx = resizedCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw resized image
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  return resizedCanvas;
}

/**
 * Validate screenshot size
 */
export function isValidScreenshotSize(bytes: number, maxSizeMB: number = 2): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return bytes <= maxBytes;
}

/**
 * Convert data URL to File object
 */
export function dataUrlToFile(dataUrl: string, filename: string = 'screenshot.png'): File {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * Capture screenshot and prepare for upload
 */
export async function captureAndPrepareScreenshot(): Promise<{
  file: File;
  preview: string;
  size: string;
}> {
  const screenshot = await captureScreenshot();

  // Validate size
  if (!isValidScreenshotSize(screenshot.size)) {
    throw new Error('Screenshot is too large (max 2MB)');
  }

  const file = dataUrlToFile(screenshot.dataUrl);

  return {
    file,
    preview: screenshot.dataUrl,
    size: formatFileSize(screenshot.size),
  };
}
