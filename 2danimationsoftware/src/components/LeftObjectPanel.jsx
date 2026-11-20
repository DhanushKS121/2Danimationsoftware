import React from 'react';
import { Box, Crop, Plus, Trash2, Bone, Move, RotateCw, Layers, Sparkles } from 'lucide-react';

export default function LeftObjectPanel({
  objects = [],
  selectedObjectId,
  onSelectObject,
  onStartSelectArea,
  isSelectingArea,
  onDeleteObject,
  onOpenCreateObject
}) {
  return (
    <aside className="left-object-panel">
      {/* Panel Header */}
      <div className="left-panel-header">
        <div className="header-title-row">
          <Box size={16} className="panel-header-icon" />
          <span className="panel-title">Objects</span>
          <span className="objects-count-badge">{objects.length}</span>
        </div>
        <span className="panel-subtitle">Rigged Drawing Puppets</span>
      </div>

      {/* Create Object & Select Area Buttons */}
      <div className="left-panel-actions">
        {onOpenCreateObject && (
          <button
            type="button"
            className="left-panel-create-btn"
            onClick={onOpenCreateObject}
            title="Draw a new puppet object in dialog modal"
          >
            <Sparkles size={15} />
            <span>+ Create Object</span>
          </button>
        )}
        <button
          type="button"
          className={`select-area-btn ${isSelectingArea ? 'active' : ''}`}
          onClick={onStartSelectArea}
          title="Drag a rectangle over your drawing on the canvas to create an object"
        >
          <Crop size={15} />
          <span>{isSelectingArea ? 'Drag Box on Canvas...' : 'Select Area'}</span>
        </button>
      </div>

      {/* Objects List */}
      <div className="objects-list-wrapper">
        {objects.length === 0 ? (
          <div className="empty-objects-guide">
            <div className="guide-icon-box">
              <Crop size={24} />
            </div>
            <div className="guide-title">No Objects Yet</div>
            <p className="guide-text">
              1. Draw on the white canvas<br />
              2. Click <strong>+ Select Area</strong><br />
              3. Drag over drawing to make object<br />
              4. Add bones & rotate drawing!
            </p>
          </div>
        ) : (
          <div className="objects-items-list">
            {objects.map((obj, index) => {
              const isSelected = obj.id === selectedObjectId;
              const userPoints = obj.bones ? obj.bones.filter((b) => !b.isMidPoint) : [];
              const pointCount = userPoints.length;
              const jointCount = obj.bones ? obj.bones.filter((b) => b.parent && !b.isMidPoint).length : 0;
              const angleDeg = Math.round(((obj.rotation || 0) * 180) / Math.PI);

              return (
                <div
                  key={obj.id}
                  className={`object-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectObject(obj.id)}
                >
                  <div className="object-thumb-box">
                    {obj.image ? (
                      <img src={obj.image} alt={obj.name} className="object-thumb-img" />
                    ) : (
                      <Box size={16} />
                    )}
                  </div>

                  <div className="object-info">
                    <span className="object-name">{obj.name}</span>
                    <div className="object-meta-row">
                      <span className="meta-pill bones-pill">
                        <Bone size={10} />
                        <span>
                          {pointCount === 0
                            ? 'Mid Pt only'
                            : `${pointCount} ${pointCount === 1 ? 'Pt' : 'Pts'}${jointCount > 0 ? ` • ${jointCount} Jt` : ''}`}
                        </span>
                      </span>
                      {angleDeg !== 0 && (
                        <span className="meta-pill angle-pill">
                          <RotateCw size={10} />
                          <span>{angleDeg}°</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="delete-object-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteObject(obj.id);
                    }}
                    title="Delete Object"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Workflow Quick Help */}
      {objects.length > 0 && (
        <div className="left-panel-footer">
          <div className="footer-step">
            <span className="step-num">1</span>
            <span>Click <strong>Point</strong> to add points on drawing</span>
          </div>
          <div className="footer-step">
            <span className="step-num">2</span>
            <span>Click <strong>Joint</strong> & tap between points to joint</span>
          </div>
        </div>
      )}
    </aside>
  );
}
