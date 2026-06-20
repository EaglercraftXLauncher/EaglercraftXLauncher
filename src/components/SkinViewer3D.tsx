/**
 * SkinViewer3D.tsx
 * Loads skinview3d from jsDelivr CDN (lazy, once) and renders a rotating
 * 3D Minecraft character wearing the given skin texture.
 *
 * Usage: <SkinViewer3D skinUrl={assetUrl(activeVersion.filename)} />
 */
import { useEffect, useRef, useState } from 'react';

const SKINVIEW3D_SRC = 'https://cdn.jsdelivr.net/npm/skinview3d@3.4.2/bundles/skinview3d.bundle.js';

// Module-level promise so the script tag is only ever injected once,
// even if multiple SkinViewer3D instances mount.
let loadPromise: Promise<void> | null = null;
function loadSkinview3d(): Promise<void> {
  if (typeof window !== 'undefined' && (window as any).skinview3d) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SKINVIEW3D_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load skinview3d'));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

interface Props {
  skinUrl: string;
  width?: number;
  height?: number;
  autoRotate?: boolean;
  walking?: boolean;
}

export default function SkinViewer3D({
  skinUrl, width = 280, height = 380, autoRotate = true, walking = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Initialize viewer once
  useEffect(() => {
    let cancelled = false;

    loadSkinview3d()
      .then(() => {
        if (cancelled || !canvasRef.current) return;
        const skinview3d = (window as any).skinview3d;
        const viewer = new skinview3d.SkinViewer({
          canvas: canvasRef.current,
          width,
          height,
          skin: skinUrl,
        });
        viewer.fov = 50;
        viewer.zoom = 0.85;
        viewer.autoRotate = autoRotate;
        viewer.autoRotateSpeed = 0.8;
        viewer.background = 0x141820; // matches --surface2

        if (walking) {
          viewer.animation = new skinview3d.WalkingAnimation();
          viewer.animation.speed = 0.6;
        }

        viewerRef.current = viewer;
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => {
      cancelled = true;
      viewerRef.current?.dispose?.();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload skin texture whenever skinUrl changes (without re-creating the viewer)
  useEffect(() => {
    if (viewerRef.current && status === 'ready') {
      viewerRef.current.loadSkin(skinUrl).catch(() => setStatus('error'));
    }
  }, [skinUrl, status]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas ref={canvasRef} width={width} height={height}
        style={{ borderRadius: 8, display: status === 'error' ? 'none' : 'block' }} />
      {status === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: 'var(--text3)', fontSize: 12,
          background: 'var(--surface2)', borderRadius: 8,
        }}>
          Loading 3D viewer…
        </div>
      )}
      {status === 'error' && (
        <div style={{
          width, height, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text3)', fontSize: 12, background: 'var(--surface2)',
          borderRadius: 8, textAlign: 'center', padding: 16,
        }}>
          Couldn't load 3D preview.<br />Falling back to flat image.
        </div>
      )}
    </div>
  );
}
