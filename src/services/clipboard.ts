/**
 * Clipboard writes must happen in a document with focus, which is why every
 * copy path runs from the side panel rather than the worker.
 */

export async function copyImage(blob: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}
