import { useLayoutEffect, useRef } from 'react';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (start: number, end: number, value: number) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};
const fraction = (value: number) => value - Math.floor(value);

// Seeded points keep the passage stable across React renders and screen rotation.
const particles = Array.from({ length: 300 }, (_, index) => ({
  angle: index * 2.3999632297,
  radius: 0.28 + fraction(index * 0.754877666 + 0.31) * 0.9,
  depth: fraction(index * 0.569840296 + 0.17) * 4,
  size: 0.65 + fraction(index * 0.438289 + 0.5) * 1.2,
  shimmer: fraction(index * 0.618034) * Math.PI * 2,
  tint: index % 3,
}));

function lightSprite(color: string) {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 48;
  const context = sprite.getContext('2d');
  if (context) {
    const glow = context.createRadialGradient(24, 24, 0, 24, 24, 24);
    glow.addColorStop(0, '#fffef8');
    glow.addColorStop(0.1, '#fffef8');
    glow.addColorStop(0.25, color);
    glow.addColorStop(1, 'transparent');
    context.fillStyle = glow;
    context.fillRect(0, 0, 48, 48);
  }
  return sprite;
}

export default function JourneyTunnel({ duration }: { duration: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context) return;

    const sprites = ['#d3c2ff', '#ffe2b0', '#b8d8ef'].map(lightSprite);
    const started = performance.now();
    let frame = 0;
    let width = 1;
    let height = 1;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      const pixelWidth = Math.round(width * pixelRatio);
      const pixelHeight = Math.round(height * pixelRatio);
      // ResizeObserver also runs on first observation; avoid clearing that first frame.
      if (canvas!.width === pixelWidth && canvas!.height === pixelHeight) return;
      canvas!.width = pixelWidth;
      canvas!.height = pixelHeight;
      context!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function paint(now: number) {
      const ctx = context!;
      const t = clamp((now - started) / duration);
      const darkness = smooth(0, 0.14, t);
      const gather = smooth(0.49, 0.745, t);
      const travel = Math.min(t, 0.49);
      const fly = travel * 5.8 + travel * travel * 3;
      const centerX = width * (0.5 + Math.sin(travel * 5) * 0.025 * (1 - gather));
      const centerY = height * (0.5 + Math.sin(travel * 4) * 0.02 * (1 - gather));
      const diagonal = Math.hypot(width, height);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgb(${245 - 240 * darkness}, ${243 - 238 * darkness}, ${238 - 232 * darkness})`;
      ctx.fillRect(0, 0, width, height);

      // A dim central haze gives the field a vanishing point without a hard ring.
      const haze = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, diagonal * 0.45);
      haze.addColorStop(0, `rgba(145, 125, 190, ${0.19 * darkness * (1 - gather)})`);
      haze.addColorStop(0.35, `rgba(65, 51, 100, ${0.14 * darkness * (1 - gather)})`);
      haze.addColorStop(1, 'transparent');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'screen';
      const visibility = smooth(0.025, 0.17, t) * (1 - smooth(0.74, 0.84, t));
      const count = width < 621 ? 200 : particles.length;
      for (let index = 0; index < count; index++) {
        const point = particles[index];
        const depth = 0.28 + ((point.depth - fly) % 4 + 4) % 4;
        const angle = point.angle + travel * 0.62 + gather * 1.3;
        const radius = point.radius * (1 - gather);
        const dx = Math.cos(angle) * radius * width * 0.63 / depth;
        const dy = Math.sin(angle) * radius * height * 0.78 / depth;
        const x = centerX + dx;
        const y = centerY + dy;
        const size = Math.min(4.5, point.size / depth + gather * 0.7);
        // Fade distant/recycled points at the far end of the tunnel.
        const depthFade = 1 - smooth(3.2, 4.28, depth);
        const twinkle = 0.7 + Math.sin(t * 15 + point.shimmer) * 0.2;
        ctx.globalAlpha = visibility * depthFade * twinkle;

        if (gather < 0.9) {
          const trail = (0.018 + travel * 0.025) * (1 - gather);
          ctx.beginPath();
          ctx.moveTo(x - dx * trail, y - dy * trail);
          ctx.lineTo(x, y);
          ctx.strokeStyle = 'rgba(226, 217, 255, 0.24)';
          ctx.lineWidth = Math.max(0.45, size * 0.42);
          ctx.stroke();
        }
        const glowSize = size * 9;
        ctx.drawImage(sprites[point.tint], x - glowSize / 2, y - glowSize / 2, glowSize, glowSize);
      }

      // All points meet before the light blooms into one continuous white wash.
      const bloom = smooth(0.735, 0.855, t);
      const fadeOut = 1 - smooth(0.885, 1, t);
      const coreRadius = 8 + gather * 32 + bloom * diagonal * 0.95;
      const core = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      core.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, gather * 0.95 + bloom)})`);
      core.addColorStop(0.2, `rgba(255, 246, 230, ${gather * 0.8})`);
      core.addColorStop(0.55, `rgba(211, 199, 245, ${gather * 0.35})`);
      core.addColorStop(1, 'transparent');
      ctx.globalAlpha = visibility * fadeOut;
      // Keep the expanding glow visible after individual points have disappeared.
      if (t > 0.74) ctx.globalAlpha = fadeOut;
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = smooth(0.79, 0.855, t) * fadeOut;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;

      if (t < 1) frame = requestAnimationFrame(paint);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    paint(started);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [duration]);

  return <canvas className="journey-tunnel" ref={canvasRef} aria-hidden="true" />;
}
