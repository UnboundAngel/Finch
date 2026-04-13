/**
 * Analyzes the luminance of an image at specific coordinates.
 * Used for dynamic UI contrast adjustment against custom backgrounds.
 */
export async function getImageLuminance(
  imageSrc: string,
  samplePoints: { x: number; y: number }[] | 'top-right' | 'left-edge' | 'right-edge' | 'center'
): Promise<number> {
  const points: { x: number; y: number }[] = typeof samplePoints === 'string' ? (
    samplePoints === 'top-right' ? [{ x: 0.95, y: 0.05 }] :
    samplePoints === 'left-edge' ? [{ x: 0.02, y: 0.5 }] :
    samplePoints === 'right-edge' ? [{ x: 0.98, y: 0.5 }] :
    [{ x: 0.5, y: 0.5 }]
  ) : samplePoints;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        resolve(0.5); 
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const results = points.map(point => {
        const px = Math.floor(point.x * img.width);
        const py = Math.floor(point.y * img.height);
        
        try {
          const pixel = ctx.getImageData(px, py, 1, 1).data;
          return (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
        } catch (e) {
          return 0.5;
        }
      });

      resolve(results[0]); // Return the first (or only) sample luminance
    };

    img.onerror = () => {
      resolve(0.5);
    };
  });
}
