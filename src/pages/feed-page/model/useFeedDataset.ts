import { useEffect, useState } from 'react';
import { parseDataset } from '@/entities/media/model/parseDataset';
import type { MediaItem } from '@/entities/media/model/types';

export function useFeedDataset() {
  const [items, setItems] = useState<ReadonlyArray<MediaItem>>([]);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    void fetch(`${import.meta.env.BASE_URL}dataset.json`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Dataset request failed: ${response.status}`);
        }
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        setItems(parseDataset(payload));
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Unable to load dataset');
      });
  }, []);

  return { items, setItems, error, isLoading: items.length === 0 && error === undefined };
}
