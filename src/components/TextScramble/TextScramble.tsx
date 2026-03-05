import { useEffect, useRef } from 'react';
import TextScrambleAnimator from './TextScrambleAnimator';

interface Props {
  phrases: string[];
  elementId?: string;
}

const shuffle = <T,>(array: T[]): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const TextScramble: React.FC<Props> = ({ phrases, elementId = 'subtitle-rotation' }) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || phrases.length === 0) {
      return;
    }

    const animator = new TextScrambleAnimator(el);
    let phraseQueue: string[] = [];
    let timeoutId: number | null = null;
    let isMounted = true;

    const next = () => {
      if (!isMounted) {
        return;
      }

      if (phraseQueue.length === 0) {
        phraseQueue = shuffle([...phrases]);

        if (phraseQueue.length > 1 && phraseQueue[phraseQueue.length - 1] === el.innerText) {
          [phraseQueue[0], phraseQueue[phraseQueue.length - 1]] = [
            phraseQueue[phraseQueue.length - 1],
            phraseQueue[0],
          ];
        }
      }

      const phrase = phraseQueue.pop();
      if (!phrase) {
        return;
      }

      animator.setText(phrase).then(() => {
        if (!isMounted) {
          return;
        }
        timeoutId = window.setTimeout(next, 3000);
      });
    };

    next();

    return () => {
      isMounted = false;
      animator.stop();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [phrases]);

  return (
    <em
      id={elementId}
      ref={elementRef}
      style={{ minHeight: '1.5em', display: 'inline-block' }}
    >
      &nbsp;
    </em>
  );
};

export default TextScramble;
