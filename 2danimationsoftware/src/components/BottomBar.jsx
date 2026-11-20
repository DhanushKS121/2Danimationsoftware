import React, { useRef, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Repeat,
  RotateCcw,
  Film,
  Sparkles
} from 'lucide-react';
import { renderPuppetObjects } from '../utils/puppetEngine';

function TimelineThumbnail({ bgImage, objects, width = 140, height = 78 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.scale(width / 1280, height / 720);

    const renderObjs = () => {
      if (objects && objects.length > 0) {
        renderPuppetObjects(ctx, objects, {}, {
          showBones: true,
          showHandles: false,
          boneWidth: 4
        });
      }
      ctx.restore();
    };

    if (bgImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        renderObjs();
      };
      img.onerror = () => {
        renderObjs();
      };
      img.src = bgImage;
      if (img.complete) {
        ctx.drawImage(img, 0, 0);
        renderObjs();
      }
    } else {
      renderObjs();
    }
  }, [bgImage, objects, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="frame-thumb-canvas" />;
}

export default function BottomBar({
  frames,
  frameObjects = [],
  keyframeIndices = [0],
  appMode = 'draw',
  currentFrameIndex,
  setCurrentFrameIndex,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onOpenCreateObjectDialog,
  isPlaying,
  setIsPlaying,
  playbackFrameIndex,
  fps,
  setFps,
  isLooping,
  setIsLooping
}) {
  const timelineScrollRef = useRef(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Active frame index whether playing or editing
  const activeIndex = isPlaying ? playbackFrameIndex : currentFrameIndex;

  // Auto-scroll timeline to active frame
  useEffect(() => {
    if (timelineScrollRef.current) {
      const activeThumb = timelineScrollRef.current.querySelector(
        `[data-frame-index="${activeIndex}"]`
      );
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeIndex]);

  const handlePrevFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    } else if (isLooping) {
      setCurrentFrameIndex(frames.length - 1);
    }
  };

  const handleNextFrame = () => {
    if (currentFrameIndex < frames.length - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    } else if (isLooping) {
      setCurrentFrameIndex(0);
    }
  };

  return (
    <footer className="bottombar">
      {/* Top row of Bottombar: Playback controls + Number of frames indicator */}
      <div className="bottombar-control-row">
        {/* Frame Count & Status */}
        <div className="frame-counter-group">
          <Film size={18} className="counter-icon" />
          <div className="counter-text">
            <span className="current-frame-number">
              Frame <strong className="highlight">{activeIndex + 1}</strong> of{' '}
              <strong className="total">{frames.length}</strong>
            </span>
            <span className="total-badge">{frames.length} {frames.length === 1 ? 'Frame' : 'Frames'}</span>
          </div>
        </div>

        {/* Playback Transport Buttons */}
        <div className="playback-transport">
          <button
            type="button"
            className="transport-btn"
            onClick={() => setCurrentFrameIndex(0)}
            disabled={isPlaying || currentFrameIndex === 0}
            title="First Frame (Home)"
          >
            <ChevronsLeft size={16} />
          </button>

          <button
            type="button"
            className="transport-btn"
            onClick={handlePrevFrame}
            disabled={isPlaying || (currentFrameIndex === 0 && !isLooping)}
            title="Previous Frame (Left Arrow)"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Large Play / Pause button */}
          <button
            type="button"
            className={`play-btn ${isPlaying ? 'playing' : ''}`}
            onClick={() => {
              if (isPlaying) {
                setCurrentFrameIndex(playbackFrameIndex);
                setIsPlaying(false);
              } else {
                setIsPlaying(true);
              }
            }}
            title={isPlaying ? 'Pause Animation (Space)' : 'Play Animation (Space)'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="play-icon-offset" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            className="transport-btn"
            onClick={handleNextFrame}
            disabled={isPlaying || (currentFrameIndex === frames.length - 1 && !isLooping)}
            title="Next Frame (Right Arrow)"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="transport-btn"
            onClick={() => setCurrentFrameIndex(frames.length - 1)}
            disabled={isPlaying || currentFrameIndex === frames.length - 1}
            title="Last Frame (End)"
          >
            <ChevronsRight size={16} />
          </button>

          <button
            type="button"
            className={`transport-btn loop-toggle ${isLooping ? 'active' : ''}`}
            onClick={() => setIsLooping(!isLooping)}
            title={isLooping ? 'Loop: ON' : 'Loop: OFF'}
          >
            <Repeat size={16} />
          </button>
        </div>

        {/* FPS Control Slider */}
        <div className="fps-control-group">
          <span className="fps-label">Speed:</span>
          <input
            type="range"
            min="1"
            max="24"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="fps-slider"
            title="Animation Speed (Frames Per Second)"
          />
          <span className="fps-value">{fps} FPS</span>
          <div className="fps-quick-presets">
            {[6, 12, 24].map((speed) => (
              <button
                key={speed}
                type="button"
                className={`fps-badge-btn ${fps === speed ? 'active' : ''}`}
                onClick={() => setFps(speed)}
              >
                {speed}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Frame Action: Delete Only */}
        <div className="frame-actions-group">
          <button
            type="button"
            className="frame-action-btn danger delete-only-btn"
            onClick={() => onDeleteFrame(currentFrameIndex)}
            disabled={isPlaying || frames.length <= 1}
            title={frames.length <= 1 ? 'Cannot delete the only frame' : 'Delete Current Frame'}
          >
            <Trash2 size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Frames Timeline Strip */}
      <div className="timeline-strip-wrapper">
        <div className="timeline-strip" ref={timelineScrollRef}>
          {frames.map((frameImgUrl, index) => {
            const isSelected = activeIndex === index;
            return (
              <div
                key={index}
                data-frame-index={index}
                className={`frame-card ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  if (!isPlaying) setCurrentFrameIndex(index);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    frameIndex: index
                  });
                }}
                title={`Frame #${index + 1} (Right-click for options)`}
              >
                <div className="frame-card-header">
                  <span className="frame-badge">#{index + 1}</span>
                  {appMode === 'object' && (
                    <span className={`keyframe-badge ${keyframeIndices.includes(index) ? 'is-key' : 'is-tween'}`}>
                      {keyframeIndices.includes(index) ? '◆ Key' : '○ Tween'}
                    </span>
                  )}
                </div>

                <div className="frame-thumbnail-box">
                  {appMode === 'object' && frameObjects && frameObjects[index] && frameObjects[index].length > 0 ? (
                    <TimelineThumbnail
                      bgImage={frameImgUrl}
                      objects={frameObjects[index]}
                    />
                  ) : frameImgUrl ? (
                    <img
                      src={frameImgUrl}
                      alt={`Frame ${index + 1}`}
                      className="frame-thumb-img"
                    />
                  ) : (
                    <div className="empty-thumbnail" />
                  )}
                </div>

                {/* Delete button shown in bottom right on hover */}
                {frames.length > 1 && !isPlaying && (
                  <button
                    type="button"
                    className="frame-card-hover-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFrame(index);
                    }}
                    title={`Delete Frame #${index + 1}`}
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {isSelected && <div className="active-frame-indicator" />}
              </div>
            );
          })}

          {/* Add Frame End Card */}
          <button
            type="button"
            className="add-frame-card"
            onClick={onAddFrame}
            disabled={isPlaying}
            title="Add New Frame"
          >
            <Plus size={22} />
            <span>Add Frame</span>
          </button>
        </div>
      </div>

      {/* Floating Context Menu on Frame Right-Click */}
      {contextMenu && (
        <div
          className="frame-context-menu"
          style={{
            position: 'fixed',
            left: `${Math.max(10, Math.min(contextMenu.x, window.innerWidth - 220))}px`,
            top: `${Math.max(10, contextMenu.y - 140)}px`,
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-header">
            <span>Frame #{contextMenu.frameIndex + 1}</span>
          </div>

          <button
            type="button"
            className="context-menu-item primary"
            onClick={() => {
              const target = contextMenu.frameIndex;
              setContextMenu(null);
              if (onOpenCreateObjectDialog) onOpenCreateObjectDialog(target);
            }}
          >
            <Sparkles size={15} />
            <span>Create Object</span>
          </button>

          <button
            type="button"
            className="context-menu-item"
            onClick={() => {
              const target = contextMenu.frameIndex;
              setContextMenu(null);
              if (onDuplicateFrame) onDuplicateFrame(target);
            }}
          >
            <Copy size={15} />
            <span>Duplicate Frame</span>
          </button>

          {frames.length > 1 && (
            <button
              type="button"
              className="context-menu-item danger"
              onClick={() => {
                const target = contextMenu.frameIndex;
                setContextMenu(null);
                if (onDeleteFrame) onDeleteFrame(target);
              }}
            >
              <Trash2 size={15} />
              <span>Delete Frame</span>
            </button>
          )}
        </div>
      )}
    </footer>
  );
}
