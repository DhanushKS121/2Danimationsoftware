import React, { useState } from 'react';
import {
  PenTool,
  Video,
  Box,
  Move,
  Bone,
  RotateCw,
  CircleDot,
  Link2,
  User,
  RotateCcw,
  Pencil,
  Eraser,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  ArrowRight,
  Star,
  Palette,
  Undo2,
  Redo2,
  Trash2,
  Layers,
  Download,
  ChevronDown,
  Sparkles,
  Highlighter,
  Feather,
  Brush,
  Bold,
  Italic,
  Sliders,
  Check
} from 'lucide-react';

const MODES = [
  {
    id: 'draw',
    name: 'Normal Mode',
    icon: PenTool,
    desc: 'Classic frame-by-frame animation',
    badge: 'Normal'
  },
  {
    id: 'object',
    name: 'Object Mode',
    icon: Box,
    desc: 'Draw, bones, joints, move & rotate keyframes',
    badge: 'Objects'
  }
];

const PENCIL_TYPES = [
  { id: 'pencil', name: 'Graphite Pencil', icon: Pencil, desc: 'Precise, fine stroke' },
  { id: 'pen', name: 'Ink Pen', icon: Brush, desc: 'Smooth solid ink' },
  { id: 'marker', name: 'Marker', icon: Highlighter, desc: 'Semi-transparent wide stroke' },
  { id: 'calligraphy', name: 'Calligraphy', icon: Feather, desc: 'Angled chisel nib' },
  { id: 'charcoal', name: 'Soft Charcoal', icon: Sparkles, desc: 'Soft feathered edge' },
];

const SHAPES = [
  { id: 'rectangle', name: 'Rectangle', icon: Square },
  { id: 'circle', name: 'Circle', icon: Circle },
  { id: 'triangle', name: 'Triangle', icon: Triangle },
  { id: 'line', name: 'Line', icon: Minus },
  { id: 'arrow', name: 'Arrow', icon: ArrowRight },
  { id: 'star', name: 'Star', icon: Star },
];

const QUICK_COLORS = [
  '#000000', '#4a4a4a', '#8e8e93', '#ffffff',
  '#ff3b30', '#ff9500', '#ffcc00', '#34c759',
  '#00c7be', '#007aff', '#5856d6', '#af52de',
  '#ff2d55', '#a2845e'
];

export default function TopBar({
  appMode = 'draw',
  setAppMode,
  // Object mode tools & puppet selection
  objectTool = 'move', // 'draw' | 'move' | 'bones' | 'rotate'
  setObjectTool,
  isSelectingArea = false,
  onStartSelectArea,
  onOpenCreateObjectDialog,
  onAddStickmanRig,
  onResetRigPose,
  onDeleteSelectedJoint,
  selectedJoint,
  // Drawing tools
  activeTool,
  setActiveTool,
  pencilType,
  setPencilType,
  strokeSize,
  setStrokeSize,
  strokeColor,
  setStrokeColor,
  fillColor,
  setFillColor,
  isFilled,
  setIsFilled,
  activeShape,
  setActiveShape,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  isBold,
  setIsBold,
  isItalic,
  setIsItalic,
  onionSkin,
  setOnionSkin,
  onionOpacity,
  setOnionOpacity,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExportGif,
  onExportZip,
  onExportPng,
  isExporting
}) {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showPencilMenu, setShowPencilMenu] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showOnionMenu, setShowOnionMenu] = useState(false);

  const currentModeObj = MODES.find((m) => m.id === appMode) || MODES[0];
  const currentPencilObj = PENCIL_TYPES.find((p) => p.id === pencilType) || PENCIL_TYPES[0];
  const currentShapeObj = SHAPES.find((s) => s.id === activeShape) || SHAPES[0];

  return (
    <header className="topbar">
      {/* Brand / Logo */}
      <div className="topbar-section brand-section">
        <div className="app-logo">
          <div className="logo-icon">
            <span className="logo-sparkle">✦</span>
          </div>
          <div className="logo-text">
            <span className="app-title">AnimStudio</span>
            <span className="app-subtitle">2D 16:9 Canvas</span>
          </div>
        </div>
      </div>

      {/* Main Tools Section */}
      <div className="topbar-section tools-section">
        {/* Mode Dropdown: Normal Mode vs Object Mode */}
        <div className="tool-dropdown-container mode-dropdown-container">
          <button
            type="button"
            className={`tool-btn mode-selector-btn ${appMode === 'object' ? 'object-mode-active' : ''}`}
            onClick={() => {
              setShowModeMenu(!showModeMenu);
              setShowPencilMenu(false);
              setShowShapesMenu(false);
              setShowColorMenu(false);
              setShowExportMenu(false);
              setShowOnionMenu(false);
            }}
            title="Switch Mode: Normal Mode or Object Mode"
          >
            <currentModeObj.icon size={17} />
            <span className="tool-label mode-name">{currentModeObj.name}</span>
            <ChevronDown size={12} className="chevron-icon" />
          </button>

          {showModeMenu && (
            <div className="dropdown-panel mode-menu">
              <div className="dropdown-title">Animation Mode</div>
              {MODES.map((mode) => {
                const IconComponent = mode.icon;
                const isCurrent = appMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    className={`dropdown-item mode-item ${isCurrent ? 'selected' : ''}`}
                    onClick={() => {
                      setAppMode(mode.id);
                      setShowModeMenu(false);
                    }}
                  >
                    <IconComponent size={18} />
                    <div className="item-text">
                      <div className="mode-title-row">
                        <span className="item-name">{mode.name}</span>
                        {mode.badge && (
                          <span className={`mode-badge ${mode.id}`}>
                            {mode.badge}
                          </span>
                        )}
                      </div>
                      <span className="item-desc">{mode.desc}</span>
                    </div>
                    {isCurrent && <Check size={14} className="check-icon" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ====================================================
            OBJECT MODE TOOLS: Draw, Move, Bones, Rotation
           ==================================================== */}
        {appMode === 'object' ? (
          <div className="object-tools-group">
            {/* Draw Tool in Object Mode */}
            <div className="tool-dropdown-container">
              <button
                type="button"
                className={`tool-btn object-tool-btn ${objectTool === 'draw' ? 'active draw-active' : ''}`}
                onClick={() => {
                  setObjectTool('draw');
                  setShowPencilMenu(!showPencilMenu);
                  setShowShapesMenu(false);
                  setShowColorMenu(false);
                }}
                title="Draw Tool: Draw directly on the canvas alongside your bones"
              >
                <Pencil size={17} />
                <span className="tool-label">Draw</span>
                <ChevronDown size={12} className="chevron-icon" />
              </button>

              {showPencilMenu && (
                <div className="dropdown-panel pencil-menu">
                  <div className="dropdown-title">Brush / Pencil Types</div>
                  {PENCIL_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        className={`dropdown-item ${pencilType === type.id ? 'selected' : ''}`}
                        onClick={() => {
                          setPencilType(type.id);
                          setObjectTool('draw');
                          setShowPencilMenu(false);
                        }}
                      >
                        <IconComponent size={16} />
                        <div className="item-text">
                          <span className="item-name">{type.name}</span>
                          <span className="item-desc">{type.desc}</span>
                        </div>
                        {pencilType === type.id && <Check size={14} className="check-icon" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create Object: Opens drawing dialog */}
            <button
              type="button"
              className="tool-btn object-tool-btn create-obj-tool-btn"
              onClick={onOpenCreateObjectDialog}
              title="Create Object: Draw a new rigged puppet object in dialog"
            >
              <Sparkles size={16} />
              <span className="tool-label">+ Create Object</span>
            </button>

            {/* Select Area Tool: Box select drawing to create an object in left toolbar */}
            <button
              type="button"
              className={`tool-btn object-tool-btn ${isSelectingArea ? 'active select-area-active' : ''}`}
              onClick={onStartSelectArea}
              title="Select Area: Drag a box over drawing to create an object in the left panel"
            >
              <Square size={17} />
              <span className="tool-label">Select Area</span>
            </button>

            {/* Point Tool: Add points on drawing */}
            <button
              type="button"
              className={`tool-btn object-tool-btn ${objectTool === 'point' ? 'active point-active' : ''}`}
              onClick={() => {
                setObjectTool('point');
                setShowPencilMenu(false);
              }}
              title="Point Tool: Click on drawing to add points"
            >
              <CircleDot size={17} />
              <span className="tool-label">Point</span>
            </button>

            {/* Joint Tool: Tap between points to joint */}
            <button
              type="button"
              className={`tool-btn object-tool-btn ${objectTool === 'joint' ? 'active joint-active' : ''}`}
              onClick={() => {
                setObjectTool('joint');
                setShowPencilMenu(false);
              }}
              title="Joint Tool: Tap between points (or click two points) to connect them with a joint"
            >
              <Link2 size={17} />
              <span className="tool-label">Joint</span>
            </button>

            {/* Move Tool */}
            <button
              type="button"
              className={`tool-btn object-tool-btn ${objectTool === 'move' ? 'active move-active' : ''}`}
              onClick={() => {
                setObjectTool('move');
                setShowPencilMenu(false);
              }}
              title="Move Tool: Drag joints to reposition limbs or translate the character"
            >
              <Move size={17} />
              <span className="tool-label">Move</span>
            </button>

            {/* Rotation Tool */}
            <button
              type="button"
              className={`tool-btn object-tool-btn ${objectTool === 'rotate' ? 'active rotate-active' : ''}`}
              onClick={() => {
                setObjectTool('rotate');
                setShowPencilMenu(false);
              }}
              title="Rotation Tool: Drag any limb to rotate around its parent pivot joint"
            >
              <RotateCw size={17} />
              <span className="tool-label">Rotation</span>
            </button>
          </div>
        ) : (
          /* ====================================================
             DRAW / MOVIE MODE TOOLS: Pencil, Text, Eraser, Shapes
             ==================================================== */
          <>
            {/* Pencil with Types Dropdown */}
            <div className="tool-dropdown-container">
              <button
                type="button"
                className={`tool-btn ${activeTool === 'pencil' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTool('pencil');
                  setShowPencilMenu(!showPencilMenu);
                  setShowModeMenu(false);
                  setShowShapesMenu(false);
                  setShowColorMenu(false);
                  setShowExportMenu(false);
                  setShowOnionMenu(false);
                }}
                title={`Pencil (${currentPencilObj.name}) - Click for pencil types`}
              >
                <currentPencilObj.icon size={18} />
                <span className="tool-label">Pencil</span>
                <ChevronDown size={12} className="chevron-icon" />
              </button>

              {showPencilMenu && (
                <div className="dropdown-panel pencil-menu">
                  <div className="dropdown-title">Pencil Types</div>
                  {PENCIL_TYPES.map((type) => {
                    const IconComponent = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        className={`dropdown-item ${pencilType === type.id ? 'selected' : ''}`}
                        onClick={() => {
                          setPencilType(type.id);
                          setActiveTool('pencil');
                          setShowPencilMenu(false);
                        }}
                      >
                        <IconComponent size={16} />
                        <div className="item-text">
                          <span className="item-name">{type.name}</span>
                          <span className="item-desc">{type.desc}</span>
                        </div>
                        {pencilType === type.id && <Check size={14} className="check-icon" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Text / "it types to write" Tool */}
            <button
              type="button"
              className={`tool-btn ${activeTool === 'text' ? 'active' : ''}`}
              onClick={() => {
                setActiveTool('text');
                setShowModeMenu(false);
                setShowPencilMenu(false);
                setShowShapesMenu(false);
                setShowColorMenu(false);
                setShowOnionMenu(false);
              }}
              title="Text Tool: Click on canvas to type text"
            >
              <Type size={18} />
              <span className="tool-label">Text</span>
            </button>

            {/* Eraser */}
            <button
              type="button"
              className={`tool-btn ${activeTool === 'eraser' ? 'active' : ''}`}
              onClick={() => {
                setActiveTool('eraser');
                setShowModeMenu(false);
                setShowPencilMenu(false);
                setShowShapesMenu(false);
                setShowColorMenu(false);
                setShowOnionMenu(false);
              }}
              title="Eraser: Erase on canvas"
            >
              <Eraser size={18} />
              <span className="tool-label">Eraser</span>
            </button>

            {/* Shapes with Dropdown */}
            <div className="tool-dropdown-container">
              <button
                type="button"
                className={`tool-btn ${activeTool === 'shape' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTool('shape');
                  setShowShapesMenu(!showShapesMenu);
                  setShowModeMenu(false);
                  setShowPencilMenu(false);
                  setShowColorMenu(false);
                  setShowExportMenu(false);
                  setShowOnionMenu(false);
                }}
                title="Shapes: Rectangle, Circle, Line, Star, Arrow..."
              >
                <currentShapeObj.icon size={18} />
                <span className="tool-label">Shapes</span>
                <ChevronDown size={12} className="chevron-icon" />
              </button>

              {showShapesMenu && (
                <div className="dropdown-panel shapes-menu">
                  <div className="dropdown-title">Choose Shape</div>
                  <div className="shapes-grid">
                    {SHAPES.map((shape) => {
                      const IconComp = shape.icon;
                      return (
                        <button
                          key={shape.id}
                          type="button"
                          className={`shape-grid-item ${activeShape === shape.id ? 'selected' : ''}`}
                          onClick={() => {
                            setActiveShape(shape.id);
                            setActiveTool('shape');
                            setShowShapesMenu(false);
                          }}
                          title={shape.name}
                        >
                          <IconComp size={20} />
                          <span>{shape.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="fill-toggle-row">
                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={isFilled}
                        onChange={(e) => setIsFilled(e.target.checked)}
                      />
                      <span>Fill Shape</span>
                    </label>
                    {isFilled && (
                      <input
                        type="color"
                        className="inline-color-input"
                        value={fillColor}
                        onChange={(e) => setFillColor(e.target.value)}
                        title="Choose fill color"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Color Picker & Swatches */}
        <div className="tool-dropdown-container">
          <button
            type="button"
            className="tool-btn color-preview-btn"
            onClick={() => {
              setShowColorMenu(!showColorMenu);
              setShowModeMenu(false);
              setShowPencilMenu(false);
              setShowShapesMenu(false);
              setShowExportMenu(false);
              setShowOnionMenu(false);
            }}
            title="Color Palette and Custom Color"
          >
            <span
              className="color-dot"
              style={{ backgroundColor: strokeColor }}
            />
            <span className="tool-label">Color</span>
            <ChevronDown size={12} className="chevron-icon" />
          </button>

          {showColorMenu && (
            <div className="dropdown-panel color-menu">
              <div className="dropdown-title">Color Palette</div>
              <div className="swatches-grid">
                {QUICK_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`swatch-btn ${strokeColor.toLowerCase() === color.toLowerCase() ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => {
                      setStrokeColor(color);
                      setShowColorMenu(false);
                    }}
                    title={color}
                  />
                ))}
              </div>

              <div className="custom-color-row">
                <span className="custom-color-label">Custom:</span>
                <input
                  type="color"
                  className="native-color-picker"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                />
                <input
                  type="text"
                  className="hex-input"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Controls (Size / Stroke / Typography) */}
      <div className="topbar-section properties-section">
        {appMode !== 'object' && activeTool === 'text' ? (
          /* Text Tool Controls */
          <div className="text-controls-group">
            <select
              className="topbar-select"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              title="Font Family"
            >
              <option value="system-ui, sans-serif">Sans-Serif</option>
              <option value="'Times New Roman', serif">Serif</option>
              <option value="'Courier New', monospace">Monospace</option>
              <option value="'Caveat', cursive, sans-serif">Handwriting</option>
            </select>

            <div className="size-slider-box" title="Font Size">
              <span className="slider-label">Size</span>
              <input
                type="range"
                min="12"
                max="80"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="topbar-slider"
              />
              <span className="slider-value">{fontSize}px</span>
            </div>

            <button
              type="button"
              className={`icon-toggle-btn ${isBold ? 'active' : ''}`}
              onClick={() => setIsBold(!isBold)}
              title="Bold"
            >
              <Bold size={14} />
            </button>

            <button
              type="button"
              className={`icon-toggle-btn ${isItalic ? 'active' : ''}`}
              onClick={() => setIsItalic(!isItalic)}
              title="Italic"
            >
              <Italic size={14} />
            </button>
          </div>
        ) : (
          /* Stroke / Bone Size Slider */
          <div className="stroke-controls-group">
            <span className="slider-label">
              {appMode === 'object' && objectTool !== 'draw' ? 'Bone Width' : (activeTool === 'eraser' ? 'Eraser' : 'Size')}:
            </span>
            <input
              type="range"
              min="2"
              max="40"
              value={strokeSize}
              onChange={(e) => setStrokeSize(Number(e.target.value))}
              className="topbar-slider"
              title="Stroke / Bone Width"
            />
            <span className="slider-value">{strokeSize}px</span>

            <div className="quick-sizes">
              {[4, 8, 14, 22].map((size) => (
                <button
                  key={size}
                  type="button"
                  className={`quick-size-dot ${strokeSize === size ? 'active' : ''}`}
                  onClick={() => setStrokeSize(size)}
                  title={`${size}px`}
                >
                  <span
                    className="dot-inner"
                    style={{ width: Math.max(3, size / 2.5), height: Math.max(3, size / 2.5) }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons: Onion Skin (with Fade adjustment), Undo/Redo, Clear, Export */}
      <div className="topbar-section actions-section">
        {/* Onion Skin Fade Toggle with Dropdown */}
        <div className="tool-dropdown-container">
          <button
            type="button"
            className={`action-btn onion-btn ${onionSkin ? 'active' : ''}`}
            onClick={() => setOnionSkin(!onionSkin)}
            title="Toggle Onion Skin: Ghost fade of previous keyframe"
          >
            <Layers size={16} />
            <span className="btn-text">Fade / Onion</span>
            <span
              className="chevron-down-trigger"
              onClick={(e) => {
                e.stopPropagation();
                setShowOnionMenu(!showOnionMenu);
              }}
              title="Adjust Fade Intensity"
            >
              <ChevronDown size={12} />
            </span>
          </button>

          {showOnionMenu && (
            <div className="dropdown-panel onion-menu">
              <div className="dropdown-title">Onion Skin Fade</div>
              <div className="fade-slider-row">
                <span className="slider-label">Fade:</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={onionOpacity}
                  onChange={(e) => setOnionOpacity(Number(e.target.value))}
                  className="topbar-slider"
                />
                <span className="slider-value">{Math.round(onionOpacity * 100)}%</span>
              </div>
              <div className="fade-presets">
                {[0.2, 0.38, 0.6].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`fade-preset-btn ${onionOpacity === val ? 'active' : ''}`}
                    onClick={() => {
                      setOnionOpacity(val);
                      setOnionSkin(true);
                      setShowOnionMenu(false);
                    }}
                  >
                    {Math.round(val * 100)}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="btn-group">
          <button
            type="button"
            className="action-icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            type="button"
            className="action-icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        {/* Clear Canvas */}
        <button
          type="button"
          className="action-icon-btn delete-btn"
          onClick={onClear}
          title="Clear Current Frame Canvas"
        >
          <Trash2 size={16} />
        </button>

        {/* Export Dropdown */}
        <div className="tool-dropdown-container">
          <button
            type="button"
            className="export-btn"
            onClick={() => {
              setShowExportMenu(!showExportMenu);
              setShowModeMenu(false);
              setShowPencilMenu(false);
              setShowShapesMenu(false);
              setShowColorMenu(false);
              setShowOnionMenu(false);
            }}
            disabled={isExporting}
            title="Export Animation"
          >
            <Download size={15} />
            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
            <ChevronDown size={12} />
          </button>

          {showExportMenu && (
            <div className="dropdown-panel export-menu">
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowExportMenu(false);
                  onExportGif();
                }}
              >
                <span className="export-badge gif">GIF</span>
                <div className="item-text">
                  <span className="item-name">Animated GIF</span>
                  <span className="item-desc">Looping animation file</span>
                </div>
              </button>

              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowExportMenu(false);
                  onExportZip();
                }}
              >
                <span className="export-badge zip">ZIP</span>
                <div className="item-text">
                  <span className="item-name">PNG Sequence</span>
                  <span className="item-desc">All frames in a ZIP</span>
                </div>
              </button>

              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setShowExportMenu(false);
                  onExportPng();
                }}
              >
                <span className="export-badge png">PNG</span>
                <div className="item-text">
                  <span className="item-name">Current Frame</span>
                  <span className="item-desc">Save single frame</span>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
