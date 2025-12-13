class TestImage {
  onload: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  src = "";
  crossOrigin = "";
  naturalWidth = 240;
  naturalHeight = 240;
  constructor() {
    setTimeout(() => this.onload && this.onload(), 0);
  }
}

(globalThis as any).Image = TestImage;
