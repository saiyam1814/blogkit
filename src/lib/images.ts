// Image store — keeps uploaded images out of the markdown text
// Markdown gets clean refs like ![name](upload://abc123.png)
// Preview resolves these to blob URLs, publish resolves to base64

const store = new Map<string, { file: File; blobUrl: string }>();

function randomId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function storeImage(file: File): string {
  const id = `${randomId()}-${file.name}`;
  const blobUrl = URL.createObjectURL(file);
  store.set(id, { file, blobUrl });
  return `upload://${id}`;
}

export function resolveForPreview(src: string): string {
  if (!src.startsWith("upload://")) return src;
  const id = src.replace("upload://", "");
  const entry = store.get(id);
  return entry?.blobUrl || src;
}

export function isUploadRef(src: string): boolean {
  return src.startsWith("upload://");
}

// Replace all upload:// refs in markdown with blob URLs for preview
export function resolveAllForPreview(markdown: string): string {
  return markdown.replace(/upload:\/\/[^)\s]+/g, (ref) => {
    const id = ref.replace("upload://", "");
    const entry = store.get(id);
    return entry?.blobUrl || ref;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Replace upload:// refs with base64 data URLs for publishing
export async function resolveForPublish(markdown: string): Promise<string> {
  const regex = /upload:\/\/[^)\s]+/g;
  const matches = markdown.match(regex);
  if (!matches) return markdown;

  let result = markdown;
  for (const ref of matches) {
    const id = ref.replace("upload://", "");
    const entry = store.get(id);
    if (entry) {
      const base64 = await fileToBase64(entry.file);
      result = result.split(ref).join(base64);
    }
  }
  return result;
}

export function clearStore(): void {
  for (const entry of store.values()) {
    URL.revokeObjectURL(entry.blobUrl);
  }
  store.clear();
}
