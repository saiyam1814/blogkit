// Image handling for BlogKit
// Uploaded images get blob URLs (short, work natively in preview)
// On publish, blob URLs are converted to base64 for the API call

export function storeImage(file: File): string {
  return URL.createObjectURL(file);
}

async function blobUrlToBase64(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Replace blob: URLs with base64 data URLs for publishing
export async function resolveForPublish(markdown: string): Promise<string> {
  const regex = /blob:[^)\s]+/g;
  const matches = markdown.match(regex);
  if (!matches) return markdown;

  let result = markdown;
  for (const blobUrl of new Set(matches)) {
    try {
      const base64 = await blobUrlToBase64(blobUrl);
      result = result.split(blobUrl).join(base64);
    } catch {
      // blob URL expired (page was refreshed)
    }
  }
  return result;
}
