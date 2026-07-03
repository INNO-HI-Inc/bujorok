/**
 * 업로드 이미지 전처리.
 * - AI 전송용: 최대 변 1568px, JPEG 압축(토큰 절약)
 * - 보관용 썸네일: 최대 변 560px
 */
export interface ProcessedImage {
  base64: string; // data URL 접두어 제거된 순수 base64
  mediaType: 'image/jpeg';
  thumbDataUrl: string;
}

const MAX_SIDE_API = 1568;
const MAX_SIDE_THUMB = 560;

export async function processImageFile(file: File): Promise<ProcessedImage> {
  const img = await loadImage(file);
  const full = drawScaled(img, MAX_SIDE_API, 0.82);
  const thumb = drawScaled(img, MAX_SIDE_THUMB, 0.72);
  const prefix = 'data:image/jpeg;base64,';
  if (!full.startsWith(prefix)) throw new Error('이미지 변환에 실패했습니다.');
  return { base64: full.slice(prefix.length), mediaType: 'image/jpeg', thumbDataUrl: thumb };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 읽을 수 없습니다. (지원 형식: JPG, PNG, WEBP 등)'));
    };
    img.src = url;
  });
}

function drawScaled(img: HTMLImageElement, maxSide: number, quality: number): string {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('캔버스를 사용할 수 없는 브라우저입니다.');
  // 흰 배경(투명 PNG 대비)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}
