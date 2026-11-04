'use client';

/**
 * Utilidades para procesamiento, compresión y extracción de miniaturas de adjuntos (fotos y vídeos)
 * para el chat integrado de Brain Up Grup.
 */

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentType(mimeType: string, fileName: string): 'image' | 'video' | 'file' {
  const mime = mimeType.toLowerCase();
  const name = fileName.toLowerCase();

  if (
    mime.startsWith('image/') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif') ||
    name.endsWith('.svg')
  ) {
    return 'image';
  }

  if (
    mime.startsWith('video/') ||
    name.endsWith('.mp4') ||
    name.endsWith('.mov') ||
    name.endsWith('.webm') ||
    name.endsWith('.avi') ||
    name.endsWith('.mkv')
  ) {
    return 'video';
  }

  return 'file';
}

/**
 * Genera un fotograma estático (thumbnail póster) a partir de un archivo de vídeo
 * en el navegador usando un elemento video en memoria y canvas.
 * Devuelve un dataURL WebP/JPEG ligero (~30-50 KB).
 */
export async function generateVideoPoster(file: File): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';

    const cleanUp = () => {
      URL.revokeObjectURL(url);
      video.remove();
    };

    // Timeout de seguridad por si el vídeo es corrupto o el códec no está soportado (ej. HEVC sin decodificador)
    const timeout = setTimeout(() => {
      cleanUp();
      resolve(null);
    }, 4000);

    video.onloadeddata = () => {
      // Intentar posicionarse en el segundo 0.5 para no capturar un fotograma negro inicial
      const targetTime = Math.min(0.5, (video.duration || 1) / 2);
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 480; // Resolución contenida para póster ultraligero
        let w = video.videoWidth || 640;
        let h = video.videoHeight || 360;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, w, h);
          const posterData = canvas.toDataURL('image/webp', 0.75);
          cleanUp();
          resolve(posterData);
          return;
        }
      } catch (err) {
        console.warn('No se pudo generar el póster del vídeo:', err);
      }
      cleanUp();
      resolve(null);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanUp();
      resolve(null);
    };
  });
}

/**
 * Comprime una imagen a formato WebP ligero (< 350 KB) en el navegador
 * antes de enviarla a la API de Slack o guardarla.
 */
export async function compressImageForChat(file: File, maxDimension = 1600): Promise<{ file: File; dataUrl: string }> {
  if (typeof window === 'undefined') {
    return { file, dataUrl: '' };
  }

  // Si ya es un WebP pequeño (< 300 KB) o un GIF (para preservar animación), no alterar
  if ((file.type === 'image/webp' && file.size < 300 * 1024) || file.type === 'image/gif') {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    return { file, dataUrl };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({ file, dataUrl: e.target?.result as string });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Calidad 82% en WebP: balance perfecto entre nitidez y peso mínimo (< 250 KB)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({ file, dataUrl: e.target?.result as string });
              return;
            }

            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], cleanName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            const dataUrl = canvas.toDataURL('image/webp', 0.82);
            resolve({ file: compressedFile, dataUrl });
          },
          'image/webp',
          0.82
        );
      };

      img.onerror = () => {
        resolve({ file, dataUrl: e.target?.result as string });
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      resolve({ file, dataUrl: '' });
    };

    reader.readAsDataURL(file);
  });
}

