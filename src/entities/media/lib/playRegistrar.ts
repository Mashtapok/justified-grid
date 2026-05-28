type Stop = () => void;

let playing: { id: string; stop: Stop } | undefined;

export function requestPlay(id: string, stop: Stop): void {
  if (playing !== undefined && playing.id !== id) {
    playing.stop();
  }
  playing = { id, stop };
}

export function release(id: string): void {
  if (playing?.id === id) {
    playing = undefined;
  }
}
