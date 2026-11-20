import React from 'react';
import {
  Sparkles,
  Crop,
  Move,
  Bone,
  RotateCw,
  Box,
  PenTool,
  Trash2,
  RotateCcw,
  Layers,
  HelpCircle,
  CircleDot,
  Link2
} from 'lucide-react';

export default function RightToolBar({
  appMode = 'draw',
  setAppMode,
  objectTool = 'move',
  setObjectTool,
  onOpenCreateObjectDialog,
  onStartSelectArea,
  isSelectingArea = false,
  selectedObject = null,
  onDeleteObject,
  onResetPose
}) {
  const userPoints = selectedObject && selectedObject.bones ? selectedObject.bones.filter((b) => !b.isMidPoint) : [];
  const pointCount = userPoints.length;
  const jointCount = selectedObject && selectedObject.bones ? selectedObject.bones.filter((b) => b.parent && !b.isMidPoint).length : 0;
  const rotationDeg = selectedObject ? Math.round(((selectedObject.rotation || 0) * 180) / Math.PI) : 0;

  return (
    <aside className="right-toolbar-panel">
      {/* Panel Header */}
      <div className="right-panel-header">
        <div className="right-header-title-row">
          <Sparkles size={16} className="right-panel-icon" />
          <span className="right-panel-title">Object Studio</span>
        </div>
        <span className="right-panel-subtitle">Create & Animate Puppets</span>
      </div>

      <div className="right-panel-scroll-content">
        {/* =========================================================
            PRIMARY ACTION: + Create Object (Dialog Drawing)
            ========================================================= */}
        <div className="right-panel-section highlight-section">
          <button
            type="button"
            className="right-create-object-btn"
            onClick={onOpenCreateObjectDialog}
            title="Open drawing dialog to draw and create a puppet object"
          >
            <div className="create-btn-icon-box">
              <Sparkles size={18} />
            </div>
            <div className="create-btn-text-col">
              <span className="create-btn-main-text">+ Create Object</span>
              <span className="create-btn-sub-text">Draw in Dialog Modal</span>
            </div>
          </button>

          {/* Secondary Action: Select Area */}
          <button
            type="button"
            className={`right-select-area-btn ${isSelectingArea ? 'active' : ''}`}
            onClick={onStartSelectArea}
            title="Drag a box over drawing on canvas to isolate as an object"
          >
            <Crop size={15} />
            <span>{isSelectingArea ? 'Dragging Box on Canvas...' : '✂ Select Area from Canvas'}</span>
          </button>
        </div>

        {/* =========================================================
            MODE QUICK TOGGLE (Normal Mode vs Object Mode)
            ========================================================= */}
        <div className="right-panel-section">
          <div className="section-label">Animation Mode</div>
          <div className="mode-toggle-group">
            <button
              type="button"
              className={`mode-toggle-btn ${appMode === 'draw' ? 'active normal-active' : ''}`}
              onClick={() => setAppMode('draw')}
              title="Normal Mode: Classic frame-by-frame drawing"
            >
              <PenTool size={14} />
              <span>Normal</span>
            </button>
            <button
              type="button"
              className={`mode-toggle-btn ${appMode === 'object' ? 'active object-active' : ''}`}
              onClick={() => setAppMode('object')}
              title="Object Mode: Puppet bones, joints, move & rotate"
            >
              <Box size={14} />
              <span>Object</span>
            </button>
          </div>
        </div>

        {/* =========================================================
            OBJECT TOOLS (Point, Joint, Move, Rotation)
            ========================================================= */}
        <div className="right-panel-section">
          <div className="section-label">Rigging & Animation Tools</div>
          <div className="rigging-tools-grid">
            {/* Point Tool */}
            <button
              type="button"
              className={`rig-tool-btn ${appMode === 'object' && objectTool === 'point' ? 'active point-active' : ''}`}
              onClick={() => {
                if (appMode !== 'object') setAppMode('object');
                setObjectTool('point');
              }}
              title="Point: Click on drawing to add points"
            >
              <CircleDot size={16} />
              <div className="rig-tool-info">
                <span className="rig-tool-name">Point</span>
                <span className="rig-tool-desc">Add Points</span>
              </div>
            </button>

            {/* Joint Tool */}
            <button
              type="button"
              className={`rig-tool-btn ${appMode === 'object' && objectTool === 'joint' ? 'active joint-active' : ''}`}
              onClick={() => {
                if (appMode !== 'object') setAppMode('object');
                setObjectTool('joint');
              }}
              title="Joint: Tap between two points (or click point 1 then point 2) to connect joint"
            >
              <Link2 size={16} />
              <div className="rig-tool-info">
                <span className="rig-tool-name">Joint</span>
                <span className="rig-tool-desc">Tap Between to Joint</span>
              </div>
            </button>

            {/* Move Tool */}
            <button
              type="button"
              className={`rig-tool-btn ${appMode === 'object' && objectTool === 'move' ? 'active move-active' : ''}`}
              onClick={() => {
                if (appMode !== 'object') setAppMode('object');
                setObjectTool('move');
              }}
              title="Move: Drag points/joints to reposition drawing"
            >
              <Move size={16} />
              <div className="rig-tool-info">
                <span className="rig-tool-name">Move</span>
                <span className="rig-tool-desc">Drag Points</span>
              </div>
            </button>

            {/* Rotation Tool */}
            <button
              type="button"
              className={`rig-tool-btn ${appMode === 'object' && objectTool === 'rotate' ? 'active rotate-active' : ''}`}
              onClick={() => {
                if (appMode !== 'object') setAppMode('object');
                setObjectTool('rotate');
              }}
              title="Rotation: Rotate bones around pivot"
            >
              <RotateCw size={16} />
              <div className="rig-tool-info">
                <span className="rig-tool-name">Rotation</span>
                <span className="rig-tool-desc">Rotate Bone</span>
              </div>
            </button>
          </div>
        </div>

        {/* =========================================================
            SELECTED OBJECT CARD & ACTIONS
            ========================================================= */}
        {selectedObject ? (
          <div className="right-panel-section selected-obj-section">
            <div className="section-label">Selected Object</div>
            <div className="selected-obj-card">
              <div className="selected-obj-thumb-box">
                {selectedObject.image ? (
                  <img src={selectedObject.image} alt={selectedObject.name} className="selected-obj-thumb" />
                ) : (
                  <Box size={20} />
                )}
              </div>
              <div className="selected-obj-meta">
                <span className="selected-obj-name">{selectedObject.name}</span>
                <div className="selected-obj-badges">
                  <span className="obj-badge bones-badge">
                    <CircleDot size={10} />
                    <span>{pointCount === 0 ? 'Mid Pt only' : `${pointCount} ${pointCount === 1 ? 'Point' : 'Points'}`}</span>
                  </span>
                  {jointCount > 0 && (
                    <span className="obj-badge angle-badge">
                      <Link2 size={10} />
                      <span>{jointCount} {jointCount === 1 ? 'Joint' : 'Joints'}</span>
                    </span>
                  )}
                  {rotationDeg !== 0 && (
                    <span className="obj-badge angle-badge">
                      <RotateCw size={10} />
                      <span>{rotationDeg}°</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="selected-obj-actions">
              {onResetPose && (
                <button
                  type="button"
                  className="obj-quick-action-btn"
                  onClick={onResetPose}
                  title="Reset joint positions to initial pose"
                >
                  <RotateCcw size={13} />
                  <span>Reset Pose</span>
                </button>
              )}

              {onDeleteObject && (
                <button
                  type="button"
                  className="obj-quick-action-btn danger"
                  onClick={() => onDeleteObject(selectedObject.id)}
                  title="Delete this object"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="right-panel-section no-obj-section">
            <div className="no-obj-box">
              <span className="no-obj-title">No Object Selected</span>
              <p className="no-obj-hint">
                Click <strong>+ Create Object</strong> above or right-click any frame to draw an object.
              </p>
            </div>
          </div>
        )}

        {/* =========================================================
            QUICK HOW-TO GUIDE
            ========================================================= */}
        <div className="right-panel-section guide-section">
          <div className="guide-header">
            <HelpCircle size={13} />
            <span>Workflow Guide</span>
          </div>
          <ol className="right-guide-list">
            <li>Right-click frame or click <strong>+ Create Object</strong>.</li>
            <li>Object starts with one <strong>center Mid Point</strong> (never used for joints).</li>
            <li>In <strong>Point</strong>, click anywhere on your drawing to add rigging points.</li>
            <li>In <strong>Joint</strong>, tap between points to joint them together.</li>
            <li>Use <strong>Move</strong> (drag points or mid point) or <strong>Rotation</strong> to pose keyframes! Center frames tween smoothly.</li>
          </ol>
        </div>
      </div>
    </aside>
  );
}
