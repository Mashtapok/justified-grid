import { useEffect, useRef } from 'react';
import type { ImageItem } from '@/entities/media/model/types';
import { mediaCache } from '@/entities/media/lib/mediaCache';
import { BUCKET_WIDTHS, pickBucket } from '@/entities/media/lib/pickBucket';
import styles from './media.module.css';
import { BlurhashPreview } from './BlurhashPreview';

export type Visibility = 'visible' | 'near' | 'far';

interface ImageMediaProps {
  item: ImageItem;
  width: number;
  visibility: Visibility;
  deferMedia: boolean;
}

export function ImageMedia({ item, width, visibility, deferMedia }: ImageMediaProps) {
  const mediaLayerRef = useRef<HTMLDivElement>(null);
  const cachedBucket = mediaCache.getLoadedBucket(item.id);
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const bucket = pickBucket(width, dpr, cachedBucket);
  const canRequestImage = visibility !== 'far' && (!deferMedia || cachedBucket !== undefined);
  const hasLoadedRequestedBucket =
    cachedBucket !== undefined && BUCKET_WIDTHS[cachedBucket] >= BUCKET_WIDTHS[bucket];
  const shouldShowBlurPreview =
    visibility === 'visible' &&
    canRequestImage &&
    item.blurhash !== undefined &&
    !hasLoadedRequestedBucket;
  const srcSet = Object.entries(item.srcset)
    .map(([size, source]) => `${source} ${BUCKET_WIDTHS[size as keyof typeof BUCKET_WIDTHS]}w`)
    .join(', ');
  const fetchPriority = visibility === 'visible' ? 'high' : 'low';

  useEffect(() => {
    const mediaLayer = mediaLayerRef.current;
    if (mediaLayer === null || !canRequestImage) {
      return;
    }

    const src = item.srcset[bucket];
    const sizes = `${Math.round(width)}px`;
    const loadedBucket = mediaCache.getLoadedBucket(item.id);

    // Reuse decoded <img> elements so returning cells avoid a second decode.
    let image = mediaCache.takeDecodedElement(item.id, bucket);
    if (image === undefined) {
      const existing = mediaLayer.querySelector('img');
      if (
        existing instanceof HTMLImageElement &&
        loadedBucket !== undefined &&
        BUCKET_WIDTHS[loadedBucket] >= BUCKET_WIDTHS[bucket]
      ) {
        image = existing;
      } else {
        const newImage = document.createElement('img');
        image = newImage;
        newImage.src = src;
        newImage.srcset = srcSet;
        newImage.sizes = sizes;
        newImage.addEventListener(
          'load',
          () => {
            mediaCache.remember(item.id, bucket, newImage, item.width / item.height);
          },
          { once: true },
        );
      }
    }

    image.className = styles.media ?? '';
    image.alt = '';
    image.draggable = false;
    image.decoding = 'async';
    image.loading = 'eager';
    image.fetchPriority = fetchPriority;
    if (image.srcset !== srcSet) {
      image.srcset = srcSet;
    }
    if (image.sizes !== sizes) {
      image.sizes = sizes;
    }

    mediaLayer.replaceChildren(image);
    return () => {
      image.remove();
    };
  }, [bucket, canRequestImage, fetchPriority, item, srcSet, width]);

  if (!canRequestImage) {
    return <div className={styles.placeholder} aria-hidden="true" />;
  }

  return (
    <div
      className={styles.mediaHost}
      data-image-cache={cachedBucket === undefined ? 'miss' : 'hit'}
    >
      {shouldShowBlurPreview && item.blurhash !== undefined ? (
        <BlurhashPreview blurhash={item.blurhash} width={item.width} height={item.height} />
      ) : null}
      <div ref={mediaLayerRef} className={styles.mediaLayer} />
    </div>
  );
}
