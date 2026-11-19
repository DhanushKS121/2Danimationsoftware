import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Exports an array of canvas elements or data URLs as an animated GIF.
 */
export async function exportAsGif(frameCanvases, fps = 10, filename = 'animation.gif') {
  if (!frameCanvases || frameCanvases.length === 0) return;

  const width = frameCanvases[0].width;
  const height = frameCanvases[0].height;
  const gif = GIFEncoder();
  const delay = Math.round(1000 / Math.max(1, fps));

  for (const canvas of frameCanvases) {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Quantize RGBA pixels to 256 colors
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, width, height, { palette, delay });
  }

  gif.finish();
  const bytes = gif.bytes();
  const blob = new Blob([bytes], { type: 'image/gif' });
  saveAs(blob, filename);
}

/**
 * Exports all frames as a ZIP archive of PNG files.
 */
export async function exportAsZip(frameCanvases, filename = 'animation_frames.zip') {
  if (!frameCanvases || frameCanvases.length === 0) return;

  const zip = new JSZip();

  for (let i = 0; i < frameCanvases.length; i++) {
    const canvas = frameCanvases[i];
    const frameNumber = String(i + 1).padStart(4, '0');
    
    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    if (blob) {
      zip.file(`frame_${frameNumber}.png`, blob);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, filename);
}

/**
 * Exports a single frame canvas as PNG.
 */
export function exportSingleFrame(canvas, filename = 'frame.png') {
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (blob) {
      saveAs(blob, filename);
    }
  }, 'image/png');
}
