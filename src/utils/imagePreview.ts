export const canOpenImagePreview = (photoUrls: string[]): boolean => {
  return photoUrls.length > 0;
};

export const nextPreviewIndex = (index: number, count: number): number => {
  if (count <= 1) {
    return 0;
  }
  return (index + 1) % count;
};

export const previousPreviewIndex = (index: number, count: number): number => {
  if (count <= 1) {
    return 0;
  }
  return (index - 1 + count) % count;
};
