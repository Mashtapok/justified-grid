import type { CSSProperties } from 'react';
import type { MediaItem } from '@/entities/media/model/types';
import { ImageMedia, type Visibility } from './ImageMedia';
import { VideoMedia } from './VideoMedia';
import styles from './media.module.css';

interface MediaCardProps {
  item: MediaItem;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visibility: Visibility;
  deferMedia: boolean;
}

export function MediaCard({ item, position, visibility, deferMedia }: MediaCardProps) {
  const style: CSSProperties = {
    width: position.width,
    height: position.height,
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
  };

  return (
    <article className={styles.cell} style={style} data-media-id={item.id}>
      {item.type === 'image' ? (
        <ImageMedia
          item={item}
          width={position.width}
          visibility={visibility}
          deferMedia={deferMedia}
        />
      ) : (
        <VideoMedia
          item={item}
          width={position.width}
          visibility={visibility}
          deferMedia={deferMedia}
        />
      )}
    </article>
  );
}
