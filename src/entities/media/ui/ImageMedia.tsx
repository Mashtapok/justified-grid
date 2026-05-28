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
  const cachedBucket = mediaCache.getLoadedBucket(item.id);
  const bucket = pickBucket(width, cachedBucket);
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
  const src = item.srcset[bucket];
  const sizes = `${Math.round(width)}px`;
  const fetchPriority = visibility === 'visible' ? 'high' : 'low';

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
      <div className={styles.mediaLayer}>
        <img
          className={styles.media}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          fetchPriority={fetchPriority}
          onLoad={() => {
            mediaCache.rememberLoadedBucket(item.id, bucket);
          }}
        />
      </div>
    </div>
  );
}
