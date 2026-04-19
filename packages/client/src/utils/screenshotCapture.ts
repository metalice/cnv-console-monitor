import { FEEDBACK_SCREENSHOT_MAX_BYTES } from '@cnv-monitor/shared';

type ScreenshotResult = { dataUrl: string } | { error: string };

const captureViaHtmlToImage = async (): Promise<string> => {
  const { toJpeg } = await import('html-to-image');

  const mainContent = document.querySelector<HTMLElement>('.pf-v6-c-page__main') ?? document.body;

  return toJpeg(mainContent, {
    cacheBust: false,
    height: Math.min(mainContent.scrollHeight, window.innerHeight),
    pixelRatio: 0.35,
    quality: 0.4,
    skipFonts: true,
    width: mainContent.clientWidth,
  });
};

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_resolve, reject) =>
      setTimeout(() => reject(new Error('Screenshot timed out')), timeoutMs),
    ),
  ]);

const CAPTURE_TIMEOUT_MS = 5_000;

export const captureScreenshot = async (): Promise<ScreenshotResult> => {
  try {
    const dataUrl = await withTimeout(captureViaHtmlToImage(), CAPTURE_TIMEOUT_MS);

    if (dataUrl.length <= FEEDBACK_SCREENSHOT_MAX_BYTES) {
      return { dataUrl };
    }

    return {
      error: `Screenshot is ${Math.round(dataUrl.length / 1024)}KB, max is ${Math.round(FEEDBACK_SCREENSHOT_MAX_BYTES / 1024)}KB`,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { error: `Capture failed: ${message}` };
  }
};
