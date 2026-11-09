import { LINE_HEIGHT, textLines, type Drawing } from './model';

export const paintDrawing = (context: CanvasRenderingContext2D, drawing: Drawing, width: number, height: number) => {
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const item of drawing.items) {
    if (item.type === 'stroke') {
      const points = item.points ?? [];
      if (points.length < 2) continue;
      context.strokeStyle = item.color;
      context.lineWidth = (item.width ?? 0) * width;
      context.beginPath();
      context.moveTo(points[0] * width, points[1] * height);
      context.lineTo(points[0] * width, points[1] * height);
      for (let index = 2; index < points.length; index += 2) context.lineTo(points[index] * width, points[index + 1] * height);
      context.stroke();
      continue;
    }
    const fontSize = (item.size ?? 0) * height;
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.textBaseline = 'top';
    context.lineWidth = fontSize * 0.16;
    context.strokeStyle = 'rgba(0,0,0,0.45)';
    context.fillStyle = item.color;
    textLines(item.text).forEach((line, index) => {
      const x = (item.x ?? 0) * width;
      const y = (item.y ?? 0) * height + index * fontSize * LINE_HEIGHT;
      context.strokeText(line, x, y);
      context.fillText(line, x, y);
    });
  }
};

export const flattenDrawing = async (image: Blob, drawing: Drawing): Promise<Blob> => {
  const bitmap = await createImageBitmap(image);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  paintDrawing(context, drawing, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Image export failed'))), 'image/png');
  });
};

export const drawnFileName = (name: string) => `${name.replace(/\.[^.]+$/, '') || 'image'}.png`;
