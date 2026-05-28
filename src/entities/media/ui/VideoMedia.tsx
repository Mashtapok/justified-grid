import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import type { VideoItem } from '@/entities/media/model/types';
import { mediaCache } from '@/entities/media/lib/mediaCache';
import { BUCKET_WIDTHS, pickBucket } from '@/entities/media/lib/pickBucket';
import { release, requestPlay } from '@/entities/media/lib/playRegistrar';
import playIcon from '@/shared/ui/icons/play.svg';
import type { Visibility } from './ImageMedia';
import styles from './media.module.css';

interface VideoMediaProps {
  item: VideoItem;
  width: number;
  visibility: Visibility;
  deferMedia: boolean;
}

const ABSOLUTE_URL = /^[a-z][a-z\d+.-]*:/i;
const VIDEO_HOVER_INTENT_DELAY_MS = 150;

/** appends the requested poster width while preserving existing query and hash parts */
function posterWithWidth(source: string, width: number): string {
  if (ABSOLUTE_URL.test(source)) {
    const url = new URL(source);
    url.searchParams.set('width', String(width));
    return url.toString();
  }

  const hashIndex = source.indexOf('#');
  const beforeHash = hashIndex === -1 ? source : source.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : source.slice(hashIndex);
  const queryIndex = beforeHash.indexOf('?');
  const path = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  const search = new URLSearchParams(queryIndex === -1 ? '' : beforeHash.slice(queryIndex + 1));
  search.set('width', String(width));
  return `${path}?${search.toString()}${hash}`;
}

export function VideoMedia({ item, width, visibility, deferMedia }: VideoMediaProps) {
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverIntentTimerRef = useRef<number | undefined>(undefined);
  const posterCacheId = `${item.id}:poster`;
  const cachedPosterBucket = mediaCache.getLoadedBucket(posterCacheId);
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio;
  const posterBucket = pickBucket(width, dpr, cachedPosterBucket);
  const hasLoadedPoster = cachedPosterBucket !== undefined;
  const canRequestPoster = visibility !== 'far' && (!deferMedia || hasLoadedPoster);
  const posterSrc = posterWithWidth(item.poster, BUCKET_WIDTHS[posterBucket]);
  const posterSrcSet = Object.values(BUCKET_WIDTHS)
    .map((bucketWidth) => `${posterWithWidth(item.poster, bucketWidth)} ${bucketWidth}w`)
    .join(', ');

  const stopPlayback = useCallback(() => {
    window.clearTimeout(hoverIntentTimerRef.current);

    videoRef.current?.pause();

    release(item.id);
    setIsPlaying(false);
  }, [item.id]);

  const startPlayback = useCallback(() => {
    if (deferMedia || visibility === 'far') {
      return;
    }

    setIsVideoMounted(true);
    setIsPlaying(true);

    requestPlay(item.id, () => {
      stopPlayback();
    });
  }, [deferMedia, item.id, stopPlayback, visibility]);

  useEffect(() => {
    const element = videoRef.current;
    if (!isVideoMounted || !isPlaying || element === null) {
      return;
    }

    const play = () => {
      void element.play().catch(() => {
        stopPlayback();
      });
    };

    if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      play();
    } else {
      element.addEventListener('canplay', play, { once: true });
      element.load();
    }

    return () => {
      element.removeEventListener('canplay', play);
    };
  }, [isVideoMounted, isPlaying, stopPlayback]);

  useEffect(
    () => () => {
      window.clearTimeout(hoverIntentTimerRef.current);
      videoRef.current?.pause();
      release(item.id);
    },
    [item.id],
  );

  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || deferMedia) {
      return;
    }

    window.clearTimeout(hoverIntentTimerRef.current);
    hoverIntentTimerRef.current = window.setTimeout(startPlayback, VIDEO_HOVER_INTENT_DELAY_MS);
  };

  const onPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      stopPlayback();
    }
  };

  const toggleTouchPlayback = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      return;
    }

    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ' && event.key !== 'Enter') {
      return;
    }
    event.preventDefault();

    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  return (
    <div
      className={styles.videoSurface}
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? 'Pause video preview' : 'Play video preview'}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerUp={toggleTouchPlayback}
      onKeyDown={onKeyDown}
    >
      {canRequestPoster ? (
        <img
          className={styles.media}
          src={posterSrc}
          srcSet={posterSrcSet}
          sizes={`${Math.round(width)}px`}
          alt=""
          loading="eager"
          decoding="async"
          draggable={false}
          onLoad={() => {
            mediaCache.rememberLoadedBucket(posterCacheId, posterBucket);
          }}
        />
      ) : (
        <div className={styles.placeholder} aria-hidden="true" />
      )}
      {isVideoMounted ? (
        <video
          ref={videoRef}
          className={styles.video}
          src={item.src}
          muted
          loop
          playsInline
          preload="none"
          tabIndex={0}
          disablePictureInPicture
        >
          Your browser does not support the video.
        </video>
      ) : null}
      <img
        className={
          isPlaying || !canRequestPoster
            ? `${styles.playIcon} ${styles.playIconHidden}`
            : styles.playIcon
        }
        src={playIcon}
        alt=""
        aria-hidden="true"
      />
    </div>
  );
}
