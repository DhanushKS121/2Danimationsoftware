import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  createObjectFromCanvasSelection,
  translateObject,
  rotateObject,
  moveJoint,
  rotateBone,
  addBoneToObject,
  renderPuppetObjects
} from '../utils/puppetEngine';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720; // 16:9 aspect ratio

export default function CanvasArea({
  appMode = 'draw',
  fps = 10,
  // Object / Puppet mode props
  objectTool = 'move', // 'draw' | 'move' | 'bones' | 'rotate'
  objects = [],
  previousObjects = [],
  selectedObjectId,
  setSelectedObjectId,
  onUpdateObject,
  onPoseModified,
  onObjectCreated,
  isSelectingArea = false,
  setIsSelectingArea,
  // Drawing tools
  activeTool,
  pencilType,
  strokeSize,
  strokeColor,
  fillColor,
  isFilled,
  activeShape,
  fontSize,
  fontFamily,
  isBold,
  isItalic,
  onionSkin,
  onionOpacity = 0.38,
  frames,
  currentFrameIndex,
  onUpdateFrame,
  onMovieLiveUpdate,
  onMovieCommit,
  isPlaying,
  playbackFrameIndex,
  pushHistory
}) {
  const containerRef = useRef(null);
  const mainCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const onionCanvasRef = useRef(null);

  const imageCacheRef = useRef({});

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);

  // Selection / Marquee area state
  const selectionStartRef = useRef(null);
  const isDraggingSelectionRef = useRef(false);

  // Object dragging / rotating state
  const isDraggingObjectRef = useRef(false);
  const isRotatingObjectRef = useRef(false);
  const isMovingJointRef = useRef(false);
  const isRotatingBoneRef = useRef(false);
  const activeJointIdRef = useRef(null);
  const hasModifiedPoseRef = useRef(false);
  const dragStartCoordsRef = useRef(null);
  const [selectedJointId, setSelectedJointId] = useState(null);
  const [hoverJointId, setHoverJointId] = useState(null);

  // Movie mode sequential frame recording
  const movieFramesRef = useRef([]);
  const movieTimerRef = useRef(null);

  const [startPoint, setStartPoint] = useState(null);
  const [lastPoint, setLastPoint] = useState(null);

  // Text tool state
  const [textInputPos, setTextInputPos] = useState(null);
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef(null);

  // Display frame index (either playing or editing)
  const displayFrameIndex = isPlaying ? playbackFrameIndex : currentFrameIndex;

  // Selected object
  const selectedObject = objects.find((o) => o.id === selectedObjectId) || objects[0] || null;

  // Keep movieFramesRef in sync with external frame resets
  useEffect(() => {
    if (!isDrawingRef.current) {
      movieFramesRef.current = [...frames];
    }
  }, [frames]);

  // Helper to get canvas coordinate from mouse / touch event
  const getCanvasCoords = useCallback((e) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
      viewportX: clientX - rect.left,
      viewportY: clientY - rect.top
    };
  }, []);

  // Check if click is inside an object, near a joint handle, or on a bone segment
  const findObjectAtCoords = useCallback((x, y, objs) => {
    if (!objs) return null;

    // Helper for distance to line segment
    const distToSegment = (px, py, x1, y1, x2, y2) => {
      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    };

    // Check in reverse order (topmost first)
    for (let i = objs.length - 1; i >= 0; i--) {
      const obj = objs[i];
      if (obj.bones && obj.bones.length > 0) {
        // 1. Check joint handle points (clickable points)
        for (const joint of obj.bones) {
          if (Math.hypot(joint.x - x, joint.y - y) <= 20) {
            return { object: obj, joint, isPoint: true };
          }
        }
        // 2. Check bone segments
        for (const joint of obj.bones) {
          if (joint.parent) {
            const parentJoint = obj.bones.find((b) => b.id === joint.parent);
            if (parentJoint && distToSegment(x, y, parentJoint.x, parentJoint.y, joint.x, joint.y) <= 14) {
              return { object: obj, joint, isBoneSegment: true };
            }
          }
        }
      }
      // 3. Check object bounding box
      if (x >= obj.x - 10 && x <= obj.x + obj.width + 10 && y >= obj.y - 10 && y <= obj.y + obj.height + 10) {
        return { object: obj, joint: null };
      }
    }
    return null;
  }, []);

  // Re-render main canvas with background and puppet objects
  const renderCanvasContent = useCallback(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const frameData = frames[displayFrameIndex];
    const drawObjects = () => {
      if (appMode === 'object' && objects.length > 0) {
        renderPuppetObjects(ctx, objects, imageCacheRef.current, {
          showBones: true,
          showHandles: !isPlaying,
          activeTool: objectTool,
          selectedObjectId,
          selectedJointId,
          hoverJointId,
          boneWidth: strokeSize
        });
      }
    };

    if (frameData) {
      const img = new Image();
      img.onload = () => {
        if (isDrawingRef.current || isDraggingObjectRef.current || isRotatingObjectRef.current) return;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(img, 0, 0);
        drawObjects();
      };
      img.src = frameData;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawObjects();
    }
  }, [displayFrameIndex, frames, appMode, objects, isPlaying, objectTool, selectedObjectId, hoverJointId, strokeSize]);

  // Sync canvas on change
  useEffect(() => {
    if (isDrawingRef.current || isDraggingObjectRef.current || isRotatingObjectRef.current) return;
    renderCanvasContent();
  }, [renderCanvasContent]);

  // Onion skin layer
  useEffect(() => {
    const onionCanvas = onionCanvasRef.current;
    if (!onionCanvas) return;
    const ctx = onionCanvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (onionSkin && !isPlaying && currentFrameIndex > 0) {
      // In Object Mode, ghost previous frame's objects
      if (appMode === 'object' && previousObjects && previousObjects.length > 0) {
        ctx.save();
        ctx.globalAlpha = onionOpacity;
        renderPuppetObjects(ctx, previousObjects, imageCacheRef.current, {
          showBones: false,
          showHandles: false
        });
        ctx.restore();
      } else if (appMode === 'draw' && !isDrawing) {
        const prevFrameData = frames[currentFrameIndex - 1];
        if (prevFrameData) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.drawImage(img, 0, 0);
          };
          img.src = prevFrameData;
        }
      }
    }
  }, [onionSkin, currentFrameIndex, frames, isPlaying, isDrawing, appMode, previousObjects, onionOpacity]);

  // Commit text tool
  const commitText = useCallback(() => {
    if (!textInputPos || !textValue.trim()) {
      setTextInputPos(null);
      setTextValue('');
      return;
    }

    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    pushHistory(canvas.toDataURL());

    ctx.save();
    ctx.fillStyle = strokeColor;
    const fontStyle = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
    ctx.font = fontStyle;
    ctx.textBaseline = 'top';

    const lines = textValue.split('\n');
    const lineHeight = fontSize * 1.25;
    lines.forEach((line, index) => {
      ctx.fillText(line, textInputPos.canvasX, textInputPos.canvasY + index * lineHeight);
    });
    ctx.restore();

    onUpdateFrame(currentFrameIndex, canvas.toDataURL());
    setTextInputPos(null);
    setTextValue('');
  }, [textInputPos, textValue, strokeColor, isItalic, isBold, fontSize, fontFamily, pushHistory, onUpdateFrame, currentFrameIndex]);

  useEffect(() => {
    if (textInputPos && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputPos]);

  // Stroke styling
  const applyStrokeStyle = (ctx, type, size, color) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (type) {
      case 'pencil':
        ctx.globalAlpha = 0.95;
        break;
      case 'pen':
        ctx.globalAlpha = 1.0;
        break;
      case 'marker':
        ctx.globalAlpha = 0.42;
        ctx.lineCap = 'square';
        break;
      case 'calligraphy':
        ctx.globalAlpha = 0.9;
        break;
      case 'charcoal':
        ctx.globalAlpha = 0.85;
        ctx.shadowBlur = Math.max(2, size / 3);
        ctx.shadowColor = color;
        break;
      default:
        ctx.globalAlpha = 1.0;
        break;
    }
  };

  // Shapes helper
  const drawShape = (ctx, shape, x1, y1, x2, y2, strokeColor, fillColor, isFilled, strokeWidth) => {
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    switch (shape) {
      case 'rectangle':
        ctx.rect(minX, minY, width, height);
        break;
      case 'circle': {
        const radiusX = width / 2;
        const radiusY = height / 2;
        ctx.ellipse(minX + radiusX, minY + radiusY, radiusX, radiusY, 0, 0, Math.PI * 2);
        break;
      }
      case 'line':
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        break;
      default:
        ctx.rect(minX, minY, width, height);
        break;
    }
    if (isFilled) ctx.fill();
    ctx.stroke();
    ctx.restore();
  };

  // Pointer Down
  const handlePointerDown = (e) => {
    if (isPlaying) return;

    if (textInputPos) {
      commitText();
      return;
    }

    const coords = getCanvasCoords(e);

    // ==========================================
    // 1. SELECT AREA MODE: Marquee Drag Box
    // ==========================================
    if (isSelectingArea) {
      isDraggingSelectionRef.current = true;
      selectionStartRef.current = { x: coords.x, y: coords.y };
      return;
    }

    // ==========================================
    // 2. OBJECT MODE: Draw, Move, Bones, Rotate
    // ==========================================
    if (appMode === 'object') {
      // 2A. Draw Tool in Object Mode
      if (objectTool === 'draw') {
        isDrawingRef.current = true;
        setIsDrawing(true);
        setStartPoint({ x: coords.x, y: coords.y });
        setLastPoint({ x: coords.x, y: coords.y });

        const canvas = mainCanvasRef.current;
        if (canvas) {
          pushHistory(canvas.toDataURL());
          const ctx = canvas.getContext('2d');
          ctx.save();
          applyStrokeStyle(ctx, pencilType, strokeSize, strokeColor);
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, strokeSize / 2, 0, Math.PI * 2);
          ctx.fillStyle = strokeColor;
          ctx.fill();
          ctx.restore();
        }
        return;
      }

      // Check if clicked an object, joint handle, or bone segment
      const hit = findObjectAtCoords(coords.x, coords.y, objects);

      if (hit) {
        setSelectedObjectId(hit.object.id);

        if (objectTool === 'move') {
          // "in move only move points": Dragging this specific point!
          if (hit.joint) {
            isMovingJointRef.current = true;
            activeJointIdRef.current = hit.joint.id;
            setSelectedJointId(hit.joint.id);
            hasModifiedPoseRef.current = true;
            return;
          } else {
            // Dragging empty region of object translates the whole object
            isDraggingObjectRef.current = true;
            dragStartCoordsRef.current = { x: coords.x, y: coords.y };
            hasModifiedPoseRef.current = true;
            return;
          }
        }

        if (objectTool === 'rotate') {
          // "in rotation bone should rotate": Rotating this bone around its parent!
          if (hit.joint && !hit.joint.isRoot) {
            isRotatingBoneRef.current = true;
            activeJointIdRef.current = hit.joint.id;
            setSelectedJointId(hit.joint.id);
            hasModifiedPoseRef.current = true;
            return;
          } else {
            // Rotating whole character around root pivot
            isRotatingObjectRef.current = true;
            dragStartCoordsRef.current = { x: coords.x, y: coords.y };
            const pivot = hit.object.pivot;
            hit.object.lastDragAngle = Math.atan2(coords.y - pivot.y, coords.x - pivot.x);
            hasModifiedPoseRef.current = true;
            return;
          }
        }
      }

      // 2B. Bones Tool: Click on drawing to add bone joint
      if (objectTool === 'bones') {
        let targetObj = hit ? hit.object : selectedObject;

        // If no object exists yet, or clicked outside, add to selected object
        if (targetObj) {
          const updatedObj = addBoneToObject(targetObj, coords.x, coords.y);
          onUpdateObject(updatedObj);
          renderCanvasContent();
        }
        return;
      }

      return;
    }

    // ==========================================
    // 3. DRAW / MOVIE MODES
    // ==========================================
    if (activeTool === 'text') {
      setTextInputPos({
        canvasX: coords.x,
        canvasY: coords.y,
        viewportX: coords.viewportX,
        viewportY: coords.viewportY
      });
      return;
    }

    isDrawingRef.current = true;
    setIsDrawing(true);
    setStartPoint({ x: coords.x, y: coords.y });
    setLastPoint({ x: coords.x, y: coords.y });

    const canvas = mainCanvasRef.current;
    if (!canvas) return;

    if (appMode === 'movie') {
      if (movieFramesRef.current.length <= 1) {
        movieFramesRef.current = [];
      }
      const initialSnap = canvas.toDataURL();
      if (movieFramesRef.current.length === 0) {
        movieFramesRef.current.push(initialSnap);
      }
      if (movieTimerRef.current) clearInterval(movieTimerRef.current);
      const intervalMs = Math.round(1000 / Math.max(1, fps));
      movieTimerRef.current = setInterval(() => {
        if (!isDrawingRef.current) return;
        const currentCanvas = mainCanvasRef.current;
        if (!currentCanvas) return;
        const currentSnap = currentCanvas.toDataURL();
        movieFramesRef.current.push(currentSnap);
        if (onMovieLiveUpdate) {
          onMovieLiveUpdate([...movieFramesRef.current]);
        }
      }, intervalMs);
    } else {
      pushHistory(canvas.toDataURL());
    }

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      const ctx = canvas.getContext('2d');
      ctx.save();
      if (activeTool === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = strokeSize * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      } else {
        applyStrokeStyle(ctx, pencilType, strokeSize, strokeColor);
      }
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, (activeTool === 'eraser' ? strokeSize * 1.5 : strokeSize) / 2, 0, Math.PI * 2);
      ctx.fillStyle = activeTool === 'eraser' ? '#FFFFFF' : strokeColor;
      ctx.fill();
      ctx.restore();
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    const coords = getCanvasCoords(e);
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;
    const overlayCtx = overlay.getContext('2d');
    overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // ==========================================
    // 1. SELECT AREA MARQUEE PREVIEW
    // ==========================================
    if (isSelectingArea && isDraggingSelectionRef.current && selectionStartRef.current) {
      const start = selectionStartRef.current;
      const minX = Math.min(start.x, coords.x);
      const minY = Math.min(start.y, coords.y);
      const w = Math.abs(coords.x - start.x);
      const h = Math.abs(coords.y - start.y);

      overlayCtx.save();
      overlayCtx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      overlayCtx.fillRect(minX, minY, w, h);
      overlayCtx.strokeStyle = '#3b82f6';
      overlayCtx.lineWidth = 2;
      overlayCtx.setLineDash([6, 6]);
      overlayCtx.strokeRect(minX, minY, w, h);

      // Dimension badge
      overlayCtx.fillStyle = '#1e293b';
      overlayCtx.fillRect(minX, minY - 22, 100, 20);
      overlayCtx.fillStyle = '#93c5fd';
      overlayCtx.font = '11px monospace';
      overlayCtx.fillText(`${Math.round(w)} × ${Math.round(h)}px`, minX + 6, minY - 8);
      overlayCtx.restore();
      return;
    }

    // ==========================================
    // 2. OBJECT MODE: Dragging, Rotating Drawing!
    // ==========================================
    if (appMode === 'object') {
      // 2A. Draw Tool in Object Mode
      if (objectTool === 'draw') {
        overlayCtx.save();
        overlayCtx.beginPath();
        overlayCtx.arc(coords.x, coords.y, strokeSize / 2, 0, Math.PI * 2);
        overlayCtx.strokeStyle = '#10b981';
        overlayCtx.lineWidth = 1.5;
        overlayCtx.setLineDash([4, 4]);
        overlayCtx.stroke();
        overlayCtx.restore();

        if (isDrawingRef.current) {
          const canvas = mainCanvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.save();
            applyStrokeStyle(ctx, pencilType, strokeSize, strokeColor);
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            ctx.restore();
            setLastPoint({ x: coords.x, y: coords.y });
          }
        }
        return;
      }

      // Check hovering for joint highlight
      const hit = findObjectAtCoords(coords.x, coords.y, objects);
      setHoverJointId(hit && hit.joint ? hit.joint.id : null);

      // 1. MOVE TOOL: "in move only move points"
      if (isMovingJointRef.current && selectedObject && activeJointIdRef.current) {
        const updated = moveJoint(selectedObject, activeJointIdRef.current, coords.x, coords.y);
        onUpdateObject(updated);
        renderCanvasContent();
        return;
      }

      // 2. ROTATION TOOL: "in rotation bone should rotate"
      if (isRotatingBoneRef.current && selectedObject && activeJointIdRef.current) {
        const updated = rotateBone(selectedObject, activeJointIdRef.current, coords.x, coords.y);
        onUpdateObject(updated);
        renderCanvasContent();
        return;
      }

      // 3. WHOLE OBJECT ROTATION
      if (isRotatingObjectRef.current && selectedObject) {
        const updated = rotateObject(selectedObject, coords.x, coords.y);
        onUpdateObject(updated);
        renderCanvasContent();
        return;
      }

      // 4. WHOLE OBJECT MOVE
      if (isDraggingObjectRef.current && selectedObject && dragStartCoordsRef.current) {
        const dx = coords.x - dragStartCoordsRef.current.x;
        const dy = coords.y - dragStartCoordsRef.current.y;
        dragStartCoordsRef.current = { x: coords.x, y: coords.y };

        const updated = translateObject(selectedObject, dx, dy);
        onUpdateObject(updated);
        renderCanvasContent();
        return;
      }

      return;
    }

    // ==========================================
    // 3. DRAW / MOVIE MODES
    // ==========================================
    if (!isPlaying) {
      overlayCtx.save();
      overlayCtx.beginPath();
      const cursorRadius = activeTool === 'eraser' ? (strokeSize * 1.5) / 2 : strokeSize / 2;
      overlayCtx.arc(coords.x, coords.y, Math.max(2, cursorRadius), 0, Math.PI * 2);
      overlayCtx.strokeStyle = activeTool === 'eraser' ? '#ef4444' : (appMode === 'movie' ? '#ef4444' : '#3b82f6');
      overlayCtx.lineWidth = 1.5;
      overlayCtx.setLineDash([4, 4]);
      overlayCtx.stroke();
      overlayCtx.restore();
    }

    if (!isDrawingRef.current || isPlaying) return;

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      const canvas = mainCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');

      ctx.save();
      if (activeTool === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = strokeSize * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (pencilType === 'calligraphy') {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeSize;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.moveTo(lastPoint.x - strokeSize / 2, lastPoint.y - strokeSize / 2);
        ctx.lineTo(coords.x - strokeSize / 2, coords.y - strokeSize / 2);
        ctx.moveTo(lastPoint.x + strokeSize / 2, lastPoint.y + strokeSize / 2);
        ctx.lineTo(coords.x + strokeSize / 2, coords.y + strokeSize / 2);
        ctx.stroke();
      } else {
        applyStrokeStyle(ctx, pencilType, strokeSize, strokeColor);
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      }
      ctx.restore();

      setLastPoint({ x: coords.x, y: coords.y });
    } else if (activeTool === 'shape') {
      drawShape(overlayCtx, activeShape, startPoint.x, startPoint.y, coords.x, coords.y, strokeColor, fillColor, isFilled, strokeSize);
    }
  };

  // Pointer Up
  const handlePointerUp = (e) => {
    const coords = getCanvasCoords(e);
    const canvas = mainCanvasRef.current;
    const overlay = overlayCanvasRef.current;

    // ==========================================
    // 1. SELECT AREA: Crop Selection into Object
    // ==========================================
    if (isSelectingArea && isDraggingSelectionRef.current && selectionStartRef.current) {
      isDraggingSelectionRef.current = false;
      const start = selectionStartRef.current;
      selectionStartRef.current = null;

      const minX = Math.round(Math.min(start.x, coords.x));
      const minY = Math.round(Math.min(start.y, coords.y));
      const width = Math.round(Math.abs(coords.x - start.x));
      const height = Math.round(Math.abs(coords.y - start.y));

      if (width >= 15 && height >= 15 && canvas) {
        // Crop the drawing into an interactive object
        const newObj = createObjectFromCanvasSelection(canvas, { minX, minY, width, height }, objects.length);

        if (newObj) {
          // Clear cropped area on background canvas so only the object exists
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(minX, minY, width, height);

          // Save canvas
          onUpdateFrame(currentFrameIndex, canvas.toDataURL());

          // Add to left toolbar
          onObjectCreated(newObj);
        }
      }

      setIsSelectingArea(false);

      if (overlay) {
        const overlayCtx = overlay.getContext('2d');
        overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      return;
    }

    // ==========================================
    // 2. OBJECT MODE: Release Drag / Rotate
    // ==========================================
    if (appMode === 'object') {
      if (objectTool === 'draw' && isDrawingRef.current) {
        isDrawingRef.current = false;
        setIsDrawing(false);
        if (canvas) {
          onUpdateFrame(currentFrameIndex, canvas.toDataURL());
        }
        setStartPoint(null);
        setLastPoint(null);
        return;
      }

      if (isMovingJointRef.current || isRotatingBoneRef.current || isDraggingObjectRef.current || isRotatingObjectRef.current) {
        isMovingJointRef.current = false;
        isRotatingBoneRef.current = false;
        isDraggingObjectRef.current = false;
        isRotatingObjectRef.current = false;
        activeJointIdRef.current = null;
        dragStartCoordsRef.current = null;
        if (selectedObject) {
          selectedObject.lastDragAngle = null;
        }

        if (hasModifiedPoseRef.current) {
          hasModifiedPoseRef.current = false;
          if (onPoseModified) {
            onPoseModified(currentFrameIndex);
          }
        }
      }
      return;
    }

    // ==========================================
    // 3. DRAW / MOVIE MODES
    // ==========================================
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsDrawing(false);

    if (appMode === 'movie') {
      if (movieTimerRef.current) {
        clearInterval(movieTimerRef.current);
        movieTimerRef.current = null;
      }
      if (canvas) {
        const finalSnap = canvas.toDataURL();
        movieFramesRef.current.push(finalSnap);
        if (onMovieCommit) {
          onMovieCommit([...movieFramesRef.current]);
        }
      }
      if (overlay) {
        const overlayCtx = overlay.getContext('2d');
        overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
      setStartPoint(null);
      setLastPoint(null);
      return;
    }

    if (!canvas || !overlay) return;

    if (activeTool === 'shape' && startPoint) {
      const ctx = canvas.getContext('2d');
      drawShape(ctx, activeShape, startPoint.x, startPoint.y, coords.x, coords.y, strokeColor, fillColor, isFilled, strokeSize);
    }

    const overlayCtx = overlay.getContext('2d');
    overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    onUpdateFrame(currentFrameIndex, canvas.toDataURL());
    setStartPoint(null);
    setLastPoint(null);
  };

  useEffect(() => {
    return () => {
      if (movieTimerRef.current) {
        clearInterval(movieTimerRef.current);
      }
    };
  }, []);

  const showOnionFade = onionSkin && !isPlaying && currentFrameIndex > 0 && appMode !== 'movie';

  const getObjectCursor = () => {
    if (isSelectingArea) return 'crosshair';
    if (appMode !== 'object') return 'crosshair';
    if (objectTool === 'draw') return 'crosshair';
    if (isDraggingObjectRef.current || isRotatingObjectRef.current) return 'grabbing';
    if (objectTool === 'rotate') return 'alias';
    if (objectTool === 'move') return 'grab';
    if (objectTool === 'bones') return 'cell';
    return 'default';
  };

  return (
    <main className="canvas-workspace">
      {/* 16:9 Aspect Ratio Frame Container */}
      <div className="canvas-wrapper-outer">
        <div
          ref={containerRef}
          className={`canvas-16-9-container ${appMode === 'movie' ? 'movie-canvas-border' : ''} ${appMode === 'object' ? 'object-canvas-border' : ''}`}
          style={{ cursor: getObjectCursor() }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (isDrawingRef.current) handlePointerUp({});
            isDraggingObjectRef.current = false;
            isRotatingObjectRef.current = false;
            isMovingJointRef.current = false;
            isRotatingBoneRef.current = false;
            activeJointIdRef.current = null;
            isDraggingSelectionRef.current = false;
            setHoverJointId(null);
            const overlay = overlayCanvasRef.current;
            if (overlay) {
              const ctx = overlay.getContext('2d');
              ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            }
          }}
        >
          {/* Main Drawing & Puppet Layer */}
          <canvas
            ref={mainCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="canvas-layer main-layer"
          />

          {/* Onion Skin Layer */}
          <canvas
            ref={onionCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="canvas-layer onion-layer"
            style={{
              opacity: showOnionFade ? (appMode === 'object' ? 1.0 : onionOpacity) : 0
            }}
          />

          {/* Overlay Layer for Marquee selection, shape preview, rotation guide */}
          <canvas
            ref={overlayCanvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="canvas-layer overlay-layer"
          />

          {/* Text input overlay */}
          {textInputPos && (
            <div
              className="canvas-text-overlay"
              style={{
                left: `${(textInputPos.canvasX / CANVAS_WIDTH) * 100}%`,
                top: `${(textInputPos.canvasY / CANVAS_HEIGHT) * 100}%`
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <textarea
                ref={textInputRef}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    commitText();
                  } else if (e.key === 'Escape') {
                    setTextInputPos(null);
                    setTextValue('');
                  }
                }}
                placeholder="Type text here..."
                style={{
                  fontFamily,
                  fontSize: `${Math.max(14, fontSize * 0.7)}px`,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  color: strokeColor
                }}
                rows={2}
              />
              <div className="text-overlay-actions">
                <button type="button" className="text-btn save-btn" onClick={commitText}>
                  Apply (Ctrl+Enter)
                </button>
                <button
                  type="button"
                  className="text-btn cancel-btn"
                  onClick={() => {
                    setTextInputPos(null);
                    setTextValue('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 16:9 Canvas Info Footer Bar */}
        <div className="canvas-meta-bar">
          <span className="meta-tag resolution">16:9 HD (1280 × 720)</span>
          <span className="meta-tag frame-indicator">
            {isPlaying ? `▶ Playing Frame ${playbackFrameIndex + 1}` : `✏ Editing Frame ${currentFrameIndex + 1}`}
          </span>
          {isSelectingArea ? (
            <span className="meta-tag select-area-tag">
              ✂ SELECT AREA: Drag a box around your drawing to create an object in the left panel
            </span>
          ) : appMode === 'object' ? (
            <span className="meta-tag object-live-tag">
              🦴 OBJECT MODE: {objectTool.toUpperCase()} • {objects.length} Objects in Left Panel
            </span>
          ) : appMode === 'movie' ? (
            <span className="meta-tag movie-live-tag">
              ● MOVIE MODE: Live writing creates frames forward ({fps} FPS)
            </span>
          ) : (
            showOnionFade && (
              <span className="meta-tag onion-tag">
                ✦ Ghost Fade of Frame {currentFrameIndex} Active ({Math.round(onionOpacity * 100)}% fade)
              </span>
            )
          )}
        </div>
      </div>
    </main>
  );
}
