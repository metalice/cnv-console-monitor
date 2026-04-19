import { FEEDBACK_SCREENSHOT_MAX_BYTES } from '@cnv-monitor/shared';

type ScreenshotResult = { dataUrl: string } | { error: string };

const isModalElement = (node: HTMLElement): boolean => {
  const classes = node.className;
  if (typeof classes !== 'string') return false;
  return (
    classes.includes('pf-v6-c-modal-box') ||
    classes.includes('pf-v6-c-backdrop') ||
    classes.includes('pf-v5-c-modal-box') ||
    classes.includes('pf-v5-c-backdrop')
  );
};

const skipModals = (node: Node): boolean => {
  if (node.nodeType !== Node.ELEMENT_NODE) return true;
  return !isModalElement(node as HTMLElement);
};

export const captureScreenshot = async (): Promise<ScreenshotResult> => {
  try {
    const { toJpeg } = await import('html-to-image');

    const baseOptions = {
      cacheBust: true,
      filter: skipModals,
      height: window.innerHeight,
      width: window.innerWidth,
    };

    const dataUrl = await toJpeg(document.body, {
      ...baseOptions,
      pixelRatio: 0.4,
      quality: 0.5,
    });

    if (dataUrl.length <= FEEDBACK_SCREENSHOT_MAX_BYTES) {
      return { dataUrl };
    }

    const smallerUrl = await toJpeg(document.body, {
      ...baseOptions,
      pixelRatio: 0.25,
      quality: 0.3,
    });

    if (smallerUrl.length <= FEEDBACK_SCREENSHOT_MAX_BYTES) {
      return { dataUrl: smallerUrl };
    }

    return {
      error: `Screenshot is ${Math.round(smallerUrl.length / 1024)}KB, max is ${Math.round(FEEDBACK_SCREENSHOT_MAX_BYTES / 1024)}KB`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Capture failed: ${message}` };
  }
};
