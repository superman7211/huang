import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point, ImageDimensions } from '../types';

interface CanvasEditorProps {
  imageSrc: string;
  brushSize: number;
  isProcessing: boolean;
  onMaskReady: (maskBase64: string) => void; // Used to export mask for processing
  triggerExport: number; // Increment to trigger export
}

const CanvasEditor: React.FC<CanvasEditorProps> = ({ 
  imageSrc, 
  brushSize, 
  isProcessing,
  onMaskReady,
  triggerExport
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<{points: Point[], size: number}[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [imgDimensions, setImgDimensions] = useState<ImageDimensions>({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);

  // Load image to get dimensions
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setImgDimensions({ width: img.width, height: img.height });
      fitImageToContainer(img.width, img.height);
    };
  }, [imageSrc]);

  // Handle container resize
  const fitImageToContainer = (imgW: number, imgH: number) => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight || window.innerHeight * 0.6;
    
    const scaleW = containerW / imgW;
    const scaleH = containerH / imgH;
    const newScale = Math.min(scaleW, scaleH, 1); // Don't scale up, only down
    
    setScale(newScale);
  };

  useEffect(() => {
    const handleResize = () => {
      if (imgDimensions.width > 0) {
        fitImageToContainer(imgDimensions.width, imgDimensions.height);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imgDimensions]);

  // Drawing Logic
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    
    let clientX, clientY;
    
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Convert screen coords to canvas internal coords (1:1 with image resolution)
    const x = (clientX - rect.left) * (canvasRef.current.width / rect.width);
    const y = (clientY - rect.top) * (canvasRef.current.height / rect.height);
    
    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isProcessing) return;
    e.preventDefault(); // Prevent scrolling on touch
    const point = getCoordinates(e);
    if (point) {
      setIsDrawing(true);
      setCurrentPath([point]);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isProcessing) return;
    e.preventDefault();
    const point = getCoordinates(e);
    if (point) {
      setCurrentPath(prev => [...prev, point]);
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      setPaths(prev => [...prev, { points: currentPath, size: brushSize }]);
      setCurrentPath([]);
    }
    setIsDrawing(false);
  };

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match actual image resolution
    canvas.width = imgDimensions.width;
    canvas.height = imgDimensions.height;

    // 1. Draw Background Image
    const img = new Image();
    img.src = imageSrc;
    // We assume image is loaded since we have dimensions, but onload safety is good
    img.onload = () => {
       ctx.drawImage(img, 0, 0);
       renderPaths(ctx);
    };
    // If cached
    if (img.complete) {
        ctx.drawImage(img, 0, 0);
        renderPaths(ctx);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageSrc, imgDimensions, paths, currentPath, isProcessing]);


  const renderPaths = (ctx: CanvasRenderingContext2D) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Helper to draw a path
    const drawPath = (pathPoints: Point[], size: number, color: string) => {
      if (pathPoints.length < 1) return;
      ctx.beginPath();
      ctx.lineWidth = size; // Brush size relative to image resolution
      ctx.strokeStyle = color;
      ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      ctx.stroke();
    };

    // Draw saved paths
    paths.forEach(path => {
      drawPath(path.points, path.size, 'rgba(239, 68, 68, 0.5)'); // Red, 50% opacity
    });

    // Draw current path
    if (currentPath.length > 0) {
      drawPath(currentPath, brushSize, 'rgba(239, 68, 68, 0.5)');
    }
  };

  // Export Mask Logic (Triggered by parent)
  useEffect(() => {
    if (triggerExport === 0) return;

    const generateMask = () => {
      const canvas = document.createElement('canvas');
      canvas.width = imgDimensions.width;
      canvas.height = imgDimensions.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Fill black (area to keep)
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw white paths (area to remove)
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'white';

      paths.forEach(path => {
        ctx.beginPath();
        ctx.lineWidth = path.size;
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();
      });

      // 3. Export
      const base64 = canvas.toDataURL('image/png');
      onMaskReady(base64);
    };

    generateMask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerExport]);

  // Undo function exposed via binding or simply managed by parent via key? 
  // For simplicity, we can let parent manage state if we lifted it, but local state is easier here.
  // We'll add an imperative handle or simple keyboard shortcut in this component?
  // Let's implement a clear/undo method if needed, but for now we stick to basic drawing.
  
  // Expose Undo/Clear to parent via a ref would be cleaner, but React pure props is better.
  // We will add "Clear" button in UI that resets `paths` via a prop key change or similar.
  // Actually, we can move `paths` up to App, but it causes too many re-renders of the image.
  // Let's keep paths local and expose a method to clear.
  
  // Better approach for React:
  // We will forward `paths` change to parent? No.
  // We will just listen to a "version" prop to reset.
  
  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 rounded-lg shadow-inner border border-slate-800"
      style={{ touchAction: 'none' }}
    >
      {imgDimensions.width > 0 && (
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{
            width: imgDimensions.width * scale,
            height: imgDimensions.height * scale,
            cursor: isProcessing ? 'wait' : `crosshair`,
          }}
          className="shadow-2xl"
        />
      )}
      
      {/* Floating Toolbar for quick actions on canvas could go here */}
      <div className="absolute top-4 right-4 flex gap-2">
         {paths.length > 0 && !isProcessing && (
             <button 
               onClick={() => setPaths(p => p.slice(0, -1))}
               className="bg-slate-800/80 hover:bg-slate-700 text-white px-3 py-1 rounded-md text-xs backdrop-blur-md border border-slate-600 transition-colors"
             >
               撤销
             </button>
         )}
         {paths.length > 0 && !isProcessing && (
             <button 
               onClick={() => { setPaths([]); setCurrentPath([]); }}
               className="bg-red-500/20 hover:bg-red-500/40 text-red-200 px-3 py-1 rounded-md text-xs backdrop-blur-md border border-red-500/30 transition-colors"
             >
               清除选区
             </button>
         )}
      </div>
    </div>
  );
};

export default CanvasEditor;