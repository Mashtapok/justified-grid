import * as RadixSlider from '@radix-ui/react-slider';
import styles from './Slider.module.css';

interface SliderProps {
  value: number;
  onValueChange: (next: number) => void;
  steps: ReadonlyArray<number>;
  ariaLabel: string;
}

export function Slider({ value, onValueChange, steps, ariaLabel }: SliderProps) {
  const index = Math.max(
    0,
    steps.findIndex((step) => step === value),
  );

  return (
    <RadixSlider.Root
      className={styles.root}
      value={[index]}
      min={0}
      max={steps.length - 1}
      step={1}
      onValueChange={([nextIndex]) => {
        const next = nextIndex === undefined ? undefined : steps[nextIndex];
        if (next !== undefined) {
          onValueChange(next);
        }
      }}
    >
      <RadixSlider.Track className={styles.track}>
        <RadixSlider.Range className={styles.range} />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        className={styles.thumb}
        aria-label={ariaLabel}
        aria-valuetext={`${value} items per row`}
      />
    </RadixSlider.Root>
  );
}
