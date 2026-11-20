import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  Pencil,
  Eraser,
  RotateCcw,
  RotateCw,
  Trash2,
  Sparkles,
  Check,
  Palette
} from 'lucide-react';

const DIALOG_CANVAS_WIDTH = 560;
const DIALOG_CANVAS_HEIGHT = 400;

const PALETTE_COLORS = [
  '#000000', '#374151', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#ffffff'
];

const BRUSH_SIZES = [2, 4, 6, 10, 16];

export default function CreateObjectModal({
  isOpen,
  onClose,
  onCreateObject,
  existingCount = 0
}) {
  const canvasRef = useRef(null);
  const [objectName, setObjectName] = useState(`Object #${existingCount + 1}`);
  const [activeTool, setActiveTool] = useState('pencil'); // 'pencil' | 'eraser'
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeSize, setStrokeSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset / initialize canvas when dialog opens
  useEffect(() => {
    if (isOpen) {
      setObjectName(`Object #${existingCount + 1}`);
      setErrorMsg('');
      setHistory([]);
      setHistoryIndex(-1);

      // Give DOM time to mount canvas
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, DIALOG_CANVAS_WIDTH, DIALOG_CANVAS_HEIGHT);
        const blankSnap = canvas.toDataURL();
        setHistory([blankSnap]);
        setHistoryIndex(0);
      }, 50);
    }
  }, [isOpen, existingCount]);

  const pushHistory = useCallback((dataUrl) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, dataUrl];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      setHistoryIndex(targetIndex);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, DIALOG_CANVAS_WIDTH, DIALOG_CANVAS_HEIGHT);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[targetIndex];
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      setHistoryIndex(targetIndex);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, DIALOG_CANVAS_WIDTH, DIALOG_CANVAS_HEIGHT);
        ctx.drawImage(img, 0, 0);
      };
      img.src = history[targetIndex];
    }
  }, [historyIndex, history]);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    pushHistory(canvas.toDataURL());
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, DIALOG_CANVAS_WIDTH, DIALOG_CANVAS_HEIGHT);
  }, [pushHistory]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    const scaleX = DIALOG_CANVAS_WIDTH / rect.width;
    const scaleY = DIALOG_CANVAS_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    setIsDrawing(true);
    setErrorMsg('');

    pushHistory(canvas.toDataURL());

    const coords = getCanvasCoords(e);
    lastPointRef.current = coords;

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.fillStyle = activeTool === 'eraser' ? '#FFFFFF' : strokeColor;
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, (activeTool === 'eraser' ? strokeSize * 1.5 : strokeSize) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas || !lastPointRef.current) return;
    const coords = getCanvasCoords(e);

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = activeTool === 'eraser' ? '#FFFFFF' : strokeColor;
    ctx.lineWidth = activeTool === 'eraser' ? strokeSize * 1.5 : strokeSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = coords;
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  // Create Object from drawn canvas
  const handleSaveObject = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Scan pixels to find non-white bounding box
    const imgData = ctx.getImageData(0, 0, DIALOG_CANVAS_WIDTH, DIALOG_CANVAS_HEIGHT);
    const data = imgData.data;

    let minX = DIALOG_CANVAS_WIDTH;
    let minY = DIALOG_CANVAS_HEIGHT;
    let maxX = 0;
    let maxY = 0;
    let hasStrokes = false;

    for (let y = 0; y < DIALOG_CANVAS_HEIGHT; y++) {
      for (let x = 0; x < DIALOG_CANVAS_WIDTH; x++) {
        const i = (y * DIALOG_CANVAS_WIDTH + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const darkness = Math.max(255 - r, 255 - g, 255 - b);

        if (darkness >= 15) {
          hasStrokes = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (!hasStrokes) {
      setErrorMsg('Please draw something on the canvas first!');
      return;
    }

    // Add padding
    const padding = 8;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(DIALOG_CANVAS_WIDTH, maxX + padding);
    maxY = Math.min(DIALOG_CANVAS_HEIGHT, maxY + padding);

    const cropW = Math.max(20, maxX - minX);
    const cropH = Math.max(20, maxY - minY);

    // Create cropped offscreen canvas with transparent background
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropW;
    cropCanvas.height = cropH;
    const cropCtx = cropCanvas.getContext('2d');

    cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

    // Filter pure white to transparent
    const cropImgData = cropCtx.getImageData(0, 0, cropW, cropH);
    const cData = cropImgData.data;
    for (let i = 0; i < cData.length; i += 4) {
      const r = cData[i];
      const g = cData[i + 1];
      const b = cData[i + 2];
      const darkness = Math.max(255 - r, 255 - g, 255 - b);
      if (darkness < 15) {
        cData[i + 3] = 0;
      }
    }
    cropCtx.putImageData(cropImgData, 0, 0);

    // Center on 1280x720 canvas
    const placeX = Math.round((1280 - cropW) / 2);
    const placeY = Math.round((720 - cropH) / 2);

    const pivot = {
      x: placeX + cropW / 2,
      y: placeY + cropH / 2
    };

    const id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const name = objectName.trim() || `Object #${existingCount + 1}`;

    // One mid point by default (not considered for joint)
    const midPoint = {
      id: 'mid_' + id,
      name: 'Mid Point',
      x: pivot.x,
      y: pivot.y,
      initX: pivot.x,
      initY: pivot.y,
      isRoot: true,
      isMidPoint: true,
      parent: null
    };

    const newObj = {
      id,
      name,
      x: placeX,
      y: placeY,
      width: cropW,
      height: cropH,
      image: cropCanvas.toDataURL(),
      imgElement: cropCanvas,
      rotation: 0,
      baseAngle: 0,
      pivot,
      bones: [midPoint]
    };

    onCreateObject(newObj);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="create-object-modal-backdrop" onClick={onClose}>
      <div className="create-object-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-dialog-header">
          <div className="modal-title-row">
            <div className="modal-title-icon-box">
              <Sparkles size={18} />
            </div>
            <div className="modal-title-text-group">
              <h3 className="modal-title">Draw New Object</h3>
              <p className="modal-subtitle">Draw your character or asset. It will become a rigged puppet object in the Left Toolbar.</p>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Object Name Input */}
        <div className="modal-name-row">
          <label htmlFor="object-name-input" className="modal-name-label">Object Name:</label>
          <input
            id="object-name-input"
            type="text"
            className="modal-name-input"
            value={objectName}
            onChange={(e) => setObjectName(e.target.value)}
            placeholder="e.g. Character Body, Arm, Tree..."
          />
        </div>

        {/* Drawing Controls Bar */}
        <div className="modal-toolbar-row">
          <div className="modal-tool-btn-group">
            <button
              type="button"
              className={`dialog-tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
              onClick={() => setActiveTool('pencil')}
              title="Pencil / Pen"
            >
              <Pencil size={15} />
              <span>Pen</span>
            </button>
            <button
              type="button"
              className={`dialog-tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setActiveTool('eraser')}
              title="Eraser"
            >
              <Eraser size={15} />
              <span>Eraser</span>
            </button>
          </div>

          <div className="dialog-divider" />

          {/* Brush Sizes */}
          <div className="dialog-sizes-group">
            <span className="dialog-label">Size:</span>
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={`size-dot-btn ${strokeSize === size ? 'active' : ''}`}
                onClick={() => setStrokeSize(size)}
                title={`${size}px`}
              >
                <span className="dot-circle" style={{ width: size + 2, height: size + 2 }} />
              </button>
            ))}
          </div>

          <div className="dialog-divider" />

          {/* Quick Color Palette */}
          <div className="dialog-colors-group">
            {PALETTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`dialog-color-swatch ${strokeColor === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => {
                  setStrokeColor(c);
                  if (activeTool === 'eraser') setActiveTool('pencil');
                }}
                title={c}
              />
            ))}
            <label className="dialog-color-picker-label" title="Custom Color">
              <Palette size={14} />
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => {
                  setStrokeColor(e.target.value);
                  if (activeTool === 'eraser') setActiveTool('pencil');
                }}
                className="dialog-native-color-input"
              />
            </label>
          </div>

          <div className="dialog-divider" />

          {/* Actions: Undo, Redo, Clear */}
          <div className="dialog-actions-group">
            <button
              type="button"
              className="dialog-action-btn"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              title="Undo"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              className="dialog-action-btn"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
            >
              <RotateCw size={14} />
            </button>
            <button
              type="button"
              className="dialog-action-btn danger"
              onClick={handleClear}
              title="Clear Canvas"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Modal Drawing Canvas Container */}
        <div className="modal-canvas-wrapper">
          <canvas
            ref={canvasRef}
            width={DIALOG_CANVAS_WIDTH}
            height={DIALOG_CANVAS_HEIGHT}
            className="dialog-drawing-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />
        </div>

        {errorMsg && (
          <div className="modal-error-alert">
            {errorMsg}
          </div>
        )}

        {/* Modal Footer */}
        <div className="modal-dialog-footer">
          <span className="modal-footer-hint">
            💡 Draw anything here — it will automatically be isolated into an Object in the Left Tool Bar.
          </span>
          <div className="modal-footer-buttons">
            <button type="button" className="modal-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="modal-create-btn" onClick={handleSaveObject}>
              <Check size={16} />
              <span>Create Object</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
