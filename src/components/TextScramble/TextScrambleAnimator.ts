type QueueItem = {
  from: string;
  to: string;
  start: number;
  end: number;
  char?: string;
};


export default class TextScrambleAnimator {
  private readonly el: HTMLElement;
  private readonly chars = '!<>-_\\/[]{}-=+*^?#________';
  private frameRequest: number | null = null;
  private frame = 0;
  private queue: QueueItem[] = [];
  private resolve: (() => void) | null = null;
  private secondaryColor: string = 'currentColor';

  constructor(el: HTMLElement) {
    this.el = el;
    this.update = this.update.bind(this);

    this.secondaryColor = window.getComputedStyle(el).getPropertyValue('--blue-discord') || 'currentColor';
  }

  setText(newText: string): Promise<void> {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);

    const promise = new Promise<void>((resolve) => {
      this.resolve = resolve;
    });

    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }

    if (this.frameRequest !== null) {
      cancelAnimationFrame(this.frameRequest);
    }

    this.frame = 0;
    this.update();
    return promise;
  }

  stop(): void {
    if (this.frameRequest !== null) {
      cancelAnimationFrame(this.frameRequest);
      this.frameRequest = null;
    }
  }

  private update(): void {
    let output = '';
    let complete = 0;

    const secondaryColor = this.secondaryColor;

    for (let i = 0; i < this.queue.length; i++) {
      let { from, to, start, end, char } = this.queue[i];

      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="dud" style="color: ${secondaryColor}; text-shadow: 0 0 5px ${secondaryColor};">${char}</span>`;
      } else {
        output += from;
      }
    }

    this.el.innerHTML = output;

    if (complete === this.queue.length) {
      this.resolve?.();
      return;
    }

    this.frameRequest = requestAnimationFrame(this.update);
    this.frame++;
  }

  private randomChar(): string {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}
