import React, { useState, useEffect, useRef, useCallback } from 'react';
import TopBar from './components/TopBar';
import CanvasArea from './components/CanvasArea';
import LeftObjectPanel from './components/LeftObjectPanel';
import RightToolBar from './components/RightToolBar';
import CreateObjectModal from './components/CreateObjectModal';
import BottomBar from './components/BottomBar';
import { exportAsGif, exportAsZip, exportSingleFrame } from './utils/gifExport';
import { cloneObjects, renderPuppetObjects, interpolateObjects } from './utils/puppetEngine';
import './App.css';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

// Helper to generate a blank 16:9 white frame data URL
const createBlankFrame = () => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  return canvas.toDataURL();
};

export default function App() {
  // Mode state: 'draw' (Default) | 'movie' | 'object'
  const [appMode, setAppMode] = useState('draw');

  // Object Mode State: 'draw' | 'move' | 'bones' | 'rotate'
  const [objectTool, setObjectTool] = useState('move');
  const [isSelectingArea, setIsSelectingArea] = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState(null);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState('pencil'); // 'pencil' | 'eraser' | 'text' | 'shape'
  const [pencilType, setPencilType] = useState('pencil');
  const [strokeSize, setStrokeSize] = useState(6);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#007aff');
  const [isFilled, setIsFilled] = useState(false);
  const [activeShape, setActiveShape] = useState('rectangle');

  // Text tool state
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState('system-ui, sans-serif');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // Frames state: clean canvas for user's own drawings!
  const [frames, setFrames] = useState(() => [createBlankFrame()]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);

  // Puppet Objects per frame: array of objects per keyframe
  // User selects an area on their drawing -> converts to Object in Left Panel -> adds bones on drawing!
  const [frameObjects, setFrameObjects] = useState(() => [[]]);

  // Keyframe indices for object tweening (frame 0 is always a keyframe)
  // "if i change move or rotaion in frame 5 centre frames should have movement"
  const [keyframeIndices, setKeyframeIndices] = useState(() => [0]);

  // Onion skinning
  const [onionSkin, setOnionSkin] = useState(true);
  const [onionOpacity, setOnionOpacity] = useState(0.38);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState(0);
  const [fps, setFps] = useState(10);
  const [isLooping, setIsLooping] = useState(true);

  // Drawing Dialog Modal state
  const [isCreateObjectModalOpen, setIsCreateObjectModalOpen] = useState(false);

  // History stack
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);

  // Active objects for current frame
  const currentObjects = frameObjects[currentFrameIndex] || [];
  const previousObjects = currentFrameIndex > 0 ? (frameObjects[currentFrameIndex - 1] || []) : [];

  // Recalculate in-between frames across all keyframe pairs
  const recalculateTweens = useCallback((currentKeyframes, baseObjects) => {
    const keys = Array.from(new Set(currentKeyframes)).sort((a, b) => a - b);
    const newObjs = [...baseObjects];

    for (let k = 0; k < keys.length - 1; k++) {
      const kA = keys[k];
      const kB = keys[k + 1];
      const count = kB - kA;
      if (count > 1) {
        const objsA = newObjs[kA];
        const objsB = newObjs[kB];
        for (let step = 1; step < count; step++) {
          const targetIdx = kA + step;
          const t = step / count;
          newObjs[targetIdx] = interpolateObjects(objsA, objsB, t);
        }
      }
    }

    // Carry forward poses after the last keyframe
    const lastKey = keys[keys.length - 1];
    if (lastKey !== undefined && lastKey < newObjs.length - 1) {
      for (let f = lastKey + 1; f < newObjs.length; f++) {
        newObjs[f] = cloneObjects(newObjs[lastKey]);
      }
    }

    return newObjs;
  }, []);

  // Start selecting area box on canvas
  const handleStartSelectArea = useCallback(() => {
    setIsSelectingArea((prev) => !prev);
  }, []);

  // Open the drawing dialog to create a new object
  const handleOpenCreateObjectDialog = useCallback((frameIdx) => {
    if (typeof frameIdx === 'number') {
      setCurrentFrameIndex(frameIdx);
    }
    setIsCreateObjectModalOpen(true);
  }, []);

  // When user draws and creates an object in the modal dialog:
  // Automatically switch to Object Mode, add to left toolbar and select it!
  const handleCreateObjectFromModal = useCallback((newObj) => {
    setFrameObjects((prev) => {
      const next = [...prev];
      const cur = next[currentFrameIndex] || [];
      next[currentFrameIndex] = [...cur, newObj];
      return next;
    });
    setAppMode('object');
    setSelectedObjectId(newObj.id);
    setObjectTool('point');
    setIsCreateObjectModalOpen(false);
  }, [currentFrameIndex]);

  // When user selects an area of their drawing on canvas -> creates an object in left toolbar
  const handleObjectCreated = useCallback((newObj) => {
    setFrameObjects((prev) => {
      const next = [...prev];
      const cur = next[currentFrameIndex] || [];
      next[currentFrameIndex] = [...cur, newObj];
      return next;
    });
    setSelectedObjectId(newObj.id);
    setIsSelectingArea(false);
    setObjectTool('point');
  }, [currentFrameIndex]);

  // Update object transformation (move, rotation, bone joint additions)
  // Real-time live interpolation across center frames!
  const handleUpdateObject = useCallback((updatedObj) => {
    setFrameObjects((prev) => {
      const next = [...prev];
      const cur = next[currentFrameIndex] || [];
      next[currentFrameIndex] = cur.map((o) => (o.id === updatedObj.id ? updatedObj : o));

      // Real-time live tweening for center frames between previous keyframe and currentFrameIndex
      const prevKeys = keyframeIndices.filter((k) => k < currentFrameIndex);
      const prevKey = prevKeys.length > 0 ? Math.max(...prevKeys) : 0;
      const count = currentFrameIndex - prevKey;

      if (count > 1) {
        const objsA = next[prevKey];
        const objsB = next[currentFrameIndex];
        for (let step = 1; step < count; step++) {
          const targetIdx = prevKey + step;
          const t = step / count;
          next[targetIdx] = interpolateObjects(objsA, objsB, t);
        }
      }

      return next;
    });
  }, [currentFrameIndex, keyframeIndices]);

  // Invoked on pointer up after moving or rotating: registers keyframe and recalculates all center frames
  const handlePoseModified = useCallback((frameIdx) => {
    setKeyframeIndices((prev) => {
      const nextKeys = Array.from(new Set([...prev, frameIdx])).sort((a, b) => a - b);
      setFrameObjects((prevObjs) => recalculateTweens(nextKeys, prevObjs));
      return nextKeys;
    });
  }, [recalculateTweens]);

  // Delete object from left panel
  const handleDeleteObject = useCallback((objId) => {
    setFrameObjects((prev) => {
      const next = [...prev];
      const cur = next[currentFrameIndex] || [];
      next[currentFrameIndex] = cur.filter((o) => o.id !== objId);
      return next;
    });
    setSelectedObjectId((prev) => (prev === objId ? null : prev));
  }, [currentFrameIndex]);

  // Switch modes
  const handleSetAppMode = useCallback((mode) => {
    setAppMode(mode);
    setIsSelectingArea(false);
    if (mode === 'movie') {
      const blank = createBlankFrame();
      setFrames([blank]);
      setCurrentFrameIndex(0);
      setPlaybackFrameIndex(0);
      setHistory([]);
      setHistoryIndex(-1);
    } else if (mode === 'object') {
      setObjectTool('move');
    }
  }, []);

  // History
  const pushHistory = useCallback((canvasDataUrl) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, canvasDataUrl];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  // Update frame data
  const handleUpdateFrame = useCallback((index, dataUrl) => {
    setFrames((prev) => {
      const next = [...prev];
      next[index] = dataUrl;
      return next;
    });
  }, []);

  // Movie mode live updates
  const handleMovieLiveUpdate = useCallback((liveFrames, currentPos) => {
    if (!liveFrames || liveFrames.length === 0) return;
    setFrames(liveFrames);
    if (currentPos !== undefined) {
      setCurrentFrameIndex(Math.min(currentPos, liveFrames.length - 1));
    }
  }, []);

  const handleMovieCommit = useCallback((recordedFrames, commitFrameIndex) => {
    if (!recordedFrames || recordedFrames.length === 0) return;
    setFrames(recordedFrames);
    const targetIdx = commitFrameIndex !== undefined ? Math.min(commitFrameIndex, recordedFrames.length - 1) : recordedFrames.length - 1;
    setCurrentFrameIndex(targetIdx);
    setPlaybackFrameIndex(0);
    setFrameObjects((prev) => {
      if (prev.length >= recordedFrames.length) return prev;
      const next = [...prev];
      while (next.length < recordedFrames.length) {
        next.push([]);
      }
      return next;
    });
  }, []);

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      handleUpdateFrame(currentFrameIndex, history[newIndex]);
    }
  }, [historyIndex, history, currentFrameIndex, handleUpdateFrame]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      handleUpdateFrame(currentFrameIndex, history[newIndex]);
    }
  }, [historyIndex, history, currentFrameIndex, handleUpdateFrame]);

  // Clear current frame
  const handleClear = useCallback(() => {
    const blank = createBlankFrame();
    if (appMode === 'movie') {
      setFrames([blank]);
      setCurrentFrameIndex(0);
      setPlaybackFrameIndex(0);
    } else {
      pushHistory(frames[currentFrameIndex]);
      handleUpdateFrame(currentFrameIndex, blank);
      if (appMode === 'object') {
        setFrameObjects((prev) => {
          const next = [...prev];
          next[currentFrameIndex] = [];
          return next;
        });
        setSelectedObjectId(null);
      }
    }
  }, [appMode, currentFrameIndex, frames, pushHistory, handleUpdateFrame]);

  // Add Frame: inherits drawing and puppet objects from current frame as next frame!
  const handleAddFrame = useCallback(() => {
    const currentFrameData = frames[currentFrameIndex] || createBlankFrame();
    setFrames((prev) => {
      const next = [...prev];
      next.splice(currentFrameIndex + 1, 0, currentFrameData);
      return next;
    });

    // Clone current frame's objects (drawings + bone poses) for next keyframe!
    setFrameObjects((prev) => {
      const next = [...prev];
      const curObjs = prev[currentFrameIndex] || [];
      next.splice(currentFrameIndex + 1, 0, cloneObjects(curObjs));
      return next;
    });

    setKeyframeIndices((prev) => {
      return prev.map((k) => (k > currentFrameIndex ? k + 1 : k));
    });

    setCurrentFrameIndex((prev) => prev + 1);
    setHistory([]);
    setHistoryIndex(-1);
  }, [currentFrameIndex, frames]);

  // Duplicate Frame
  const handleDuplicateFrame = useCallback(() => {
    const currentData = frames[currentFrameIndex];
    setFrames((prev) => {
      const next = [...prev];
      next.splice(currentFrameIndex + 1, 0, currentData);
      return next;
    });

    setFrameObjects((prev) => {
      const next = [...prev];
      const curObjs = prev[currentFrameIndex] || [];
      next.splice(currentFrameIndex + 1, 0, cloneObjects(curObjs));
      return next;
    });

    setKeyframeIndices((prev) => {
      return prev.map((k) => (k > currentFrameIndex ? k + 1 : k));
    });

    setCurrentFrameIndex((prev) => prev + 1);
    setHistory([]);
    setHistoryIndex(-1);
  }, [currentFrameIndex, frames]);

  // Delete Frame
  const handleDeleteFrame = useCallback((indexToDelete) => {
    if (frames.length <= 1) return;

    setFrames((prev) => prev.filter((_, idx) => idx !== indexToDelete));
    setFrameObjects((prev) => prev.filter((_, idx) => idx !== indexToDelete));

    setKeyframeIndices((prev) => {
      const updated = prev
        .filter((k) => k !== indexToDelete)
        .map((k) => (k > indexToDelete ? k - 1 : k));
      return updated.length > 0 ? Array.from(new Set(updated)).sort((a, b) => a - b) : [0];
    });

    if (currentFrameIndex >= indexToDelete && currentFrameIndex > 0) {
      setCurrentFrameIndex((prev) => prev - 1);
    }
    setHistory([]);
    setHistoryIndex(-1);
  }, [frames.length, currentFrameIndex]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      setPlaybackFrameIndex(currentFrameIndex);
      return;
    }

    let animationFrameId;
    let lastTimestamp = performance.now();
    const frameInterval = 1000 / fps;

    const loop = (currentTimestamp) => {
      const delta = currentTimestamp - lastTimestamp;

      if (delta >= frameInterval) {
        lastTimestamp = currentTimestamp - (delta % frameInterval);

        setPlaybackFrameIndex((prev) => {
          if (prev >= frames.length - 1) {
            if (isLooping) {
              return 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, fps, frames.length, isLooping, currentFrameIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => {
          if (prev) {
            setCurrentFrameIndex(playbackFrameIndex);
          }
          return !prev;
        });
      } else if (e.code === 'ArrowLeft' && !isPlaying) {
        e.preventDefault();
        setCurrentFrameIndex((prev) => Math.max(0, prev - 1));
      } else if (e.code === 'ArrowRight' && !isPlaying) {
        e.preventDefault();
        setCurrentFrameIndex((prev) => Math.min(frames.length - 1, prev + 1));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, frames.length, handleUndo, handleRedo]);

  // Convert frames & puppet drawings to canvas elements for export
  const getCanvasesFromFrames = async () => {
    const canvases = [];
    for (let i = 0; i < frames.length; i++) {
      const dataUrl = frames[i];
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const currentObjs = frameObjects[i];
          if (currentObjs && currentObjs.length > 0) {
            renderPuppetObjects(ctx, currentObjs, {}, {
              showBones: false,
              showHandles: false
            });
          }
          resolve();
        };
        img.onerror = () => {
          const currentObjs = frameObjects[i];
          if (currentObjs && currentObjs.length > 0) {
            renderPuppetObjects(ctx, currentObjs, {}, {
              showBones: false,
              showHandles: false
            });
          }
          resolve();
        };
        img.src = dataUrl;
      });
      canvases.push(canvas);
    }
    return canvases;
  };

  // Export handlers
  const handleExportGif = async () => {
    try {
      setIsExporting(true);
      const canvases = await getCanvasesFromFrames();
      await exportAsGif(canvases, fps, 'animstudio_animation.gif');
    } catch (err) {
      console.error('Export GIF failed:', err);
      alert('Failed to export GIF: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      const canvases = await getCanvasesFromFrames();
      await exportAsZip(canvases, 'animstudio_frames.zip');
    } catch (err) {
      console.error('Export ZIP failed:', err);
      alert('Failed to export ZIP: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPng = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        if (currentObjects && currentObjects.length > 0) {
          renderPuppetObjects(ctx, currentObjects, {}, {
            showBones: false,
            showHandles: false
          });
        }
        exportSingleFrame(canvas, `frame_${currentFrameIndex + 1}.png`);
      };
      img.src = frames[currentFrameIndex];
    } catch (err) {
      console.error('Export PNG failed:', err);
    }
  };

  return (
    <div className="animation-app-root">
      {/* Top Bar: Mode Dropdown, Object Tools (Draw, Select Area, Move, Bones, Rotation) */}
      <TopBar
        appMode={appMode}
        setAppMode={handleSetAppMode}
        objectTool={objectTool}
        setObjectTool={setObjectTool}
        isSelectingArea={isSelectingArea}
        onStartSelectArea={handleStartSelectArea}
        onOpenCreateObjectDialog={() => handleOpenCreateObjectDialog(currentFrameIndex)}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        pencilType={pencilType}
        setPencilType={setPencilType}
        strokeSize={strokeSize}
        setStrokeSize={setStrokeSize}
        strokeColor={strokeColor}
        setStrokeColor={setStrokeColor}
        fillColor={fillColor}
        setFillColor={setFillColor}
        isFilled={isFilled}
        setIsFilled={setIsFilled}
        activeShape={activeShape}
        setActiveShape={setActiveShape}
        fontSize={fontSize}
        setFontSize={setFontSize}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        isBold={isBold}
        setIsBold={setIsBold}
        isItalic={isItalic}
        setIsItalic={setIsItalic}
        onionSkin={onionSkin}
        setOnionSkin={setOnionSkin}
        onionOpacity={onionOpacity}
        setOnionOpacity={setOnionOpacity}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClear={handleClear}
        onExportGif={handleExportGif}
        onExportZip={handleExportZip}
        onExportPng={handleExportPng}
        isExporting={isExporting}
      />

      {/* Middle Workspace: Left Object Panel (in Object Mode) + 16:9 Canvas + Right Tool Bar */}
      <div className="workspace-middle-container">
        {appMode === 'object' && (
          <LeftObjectPanel
            objects={currentObjects}
            selectedObjectId={selectedObjectId}
            onSelectObject={setSelectedObjectId}
            onStartSelectArea={handleStartSelectArea}
            isSelectingArea={isSelectingArea}
            onDeleteObject={handleDeleteObject}
            onOpenCreateObject={() => handleOpenCreateObjectDialog(currentFrameIndex)}
          />
        )}

        {/* 16:9 Canvas Area */}
        <CanvasArea
          appMode={appMode}
          fps={fps}
          objectTool={objectTool}
          objects={isPlaying ? (frameObjects[playbackFrameIndex] || []) : currentObjects}
          previousObjects={previousObjects}
          selectedObjectId={selectedObjectId}
          setSelectedObjectId={setSelectedObjectId}
          onUpdateObject={handleUpdateObject}
          onPoseModified={handlePoseModified}
          onObjectCreated={handleObjectCreated}
          onOpenCreateObjectDialog={handleOpenCreateObjectDialog}
          isSelectingArea={isSelectingArea}
          setIsSelectingArea={setIsSelectingArea}
          activeTool={activeTool}
          pencilType={pencilType}
          strokeSize={strokeSize}
          strokeColor={strokeColor}
          fillColor={fillColor}
          isFilled={isFilled}
          activeShape={activeShape}
          fontSize={fontSize}
          fontFamily={fontFamily}
          isBold={isBold}
          isItalic={isItalic}
          onionSkin={onionSkin}
          onionOpacity={onionOpacity}
          frames={frames}
          currentFrameIndex={currentFrameIndex}
          onUpdateFrame={handleUpdateFrame}
          onMovieLiveUpdate={handleMovieLiveUpdate}
          onMovieCommit={handleMovieCommit}
          isPlaying={isPlaying}
          playbackFrameIndex={playbackFrameIndex}
          pushHistory={pushHistory}
        />

        {/* Right Tool Bar: Option to Create Object, Rigging Tools, Object Properties */}
        <RightToolBar
          appMode={appMode}
          setAppMode={handleSetAppMode}
          objectTool={objectTool}
          setObjectTool={setObjectTool}
          onOpenCreateObjectDialog={() => handleOpenCreateObjectDialog(currentFrameIndex)}
          onStartSelectArea={handleStartSelectArea}
          isSelectingArea={isSelectingArea}
          selectedObject={currentObjects.find((o) => o.id === selectedObjectId) || null}
          onDeleteObject={handleDeleteObject}
          onResetPose={() => {
            if (selectedObjectId) {
              setFrameObjects((prev) => {
                const next = [...prev];
                const cur = next[currentFrameIndex] || [];
                next[currentFrameIndex] = cur.map((o) => {
                  if (o.id !== selectedObjectId) return o;
                  return {
                    ...o,
                    rotation: 0,
                    bones: o.bones.map((b) => ({ ...b, x: b.initX, y: b.initY }))
                  };
                });
                return next;
              });
            }
          }}
        />
      </div>

      {/* Bottom Bar: Timeline with Number of Frames, Playback & Keyframe Center Frames Animation */}
      <BottomBar
        frames={frames}
        frameObjects={frameObjects}
        keyframeIndices={keyframeIndices}
        appMode={appMode}
        currentFrameIndex={currentFrameIndex}
        setCurrentFrameIndex={setCurrentFrameIndex}
        onAddFrame={handleAddFrame}
        onDuplicateFrame={handleDuplicateFrame}
        onDeleteFrame={handleDeleteFrame}
        onOpenCreateObjectDialog={handleOpenCreateObjectDialog}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        playbackFrameIndex={playbackFrameIndex}
        fps={fps}
        setFps={setFps}
        isLooping={isLooping}
        setIsLooping={setIsLooping}
      />

      {/* Create Object Drawing Dialog Modal */}
      <CreateObjectModal
        isOpen={isCreateObjectModalOpen}
        onClose={() => setIsCreateObjectModalOpen(false)}
        onCreateObject={handleCreateObjectFromModal}
        existingCount={currentObjects.length}
      />
    </div>
  );
}
