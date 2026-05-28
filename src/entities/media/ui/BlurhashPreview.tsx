import { useEffect, useRef } from 'react';
import { decode } from 'blurhash';
import styles from './media.module.css';

export interface BlurhashPreviewProps {
  blurhash: string;
  width: number;
  height: number;
}

const BLURHASH_PREVIEW_MAX_SIZE = 32;

function getBlurhashPreviewSize(width: number, height: number): { width: number; height: number } {
  if (width >= height) {
    return {
      width: BLURHASH_PREVIEW_MAX_SIZE,
      height: Math.max(1, Math.round((height / width) * BLURHASH_PREVIEW_MAX_SIZE)),
    };
  }

  return {
    width: Math.max(1, Math.round((width / height) * BLURHASH_PREVIEW_MAX_SIZE)),
    height: BLURHASH_PREVIEW_MAX_SIZE,
  };
}

export function BlurhashPreview({ blurhash, width, height }: BlurhashPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewSize = getBlurhashPreviewSize(width, height);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }

    const context = canvas.getContext('2d');
    if (context === null) {
      return;
    }

    try {
      const pixels = decode(blurhash, previewSize.width, previewSize.height);
      const imageData = context.createImageData(previewSize.width, previewSize.height);
      imageData.data.set(pixels);
      context.putImageData(imageData, 0, 0);
    } catch {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [blurhash, previewSize.height, previewSize.width]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.blurPreview}
      width={previewSize.width}
      height={previewSize.height}
      aria-hidden="true"
    />
  );
}
