/**
 * Bone Rigging & Kinematics Engine for 2D Animation
 */

export function createDefaultStickmanRig(cx = 640, cy = 360) {
  return [
    { id: 'pelvis', name: 'Pelvis (Root)', x: cx, y: cy + 30, parent: null, isRoot: true },
    { id: 'chest', name: 'Chest', x: cx, y: cy - 90, parent: 'pelvis' },
    { id: 'neck', name: 'Neck', x: cx, y: cy - 145, parent: 'chest' },
    { id: 'head', name: 'Head', x: cx, y: cy - 200, parent: 'neck', isHead: true, radius: 48 },
    // Left Arm
    { id: 'l_elbow', name: 'Left Elbow', x: cx - 85, y: cy - 90, parent: 'chest' },
    { id: 'l_hand', name: 'Left Hand', x: cx - 170, y: cy - 90, parent: 'l_elbow' },
    // Right Arm
    { id: 'r_elbow', name: 'Right Elbow', x: cx + 85, y: cy - 90, parent: 'chest' },
    { id: 'r_hand', name: 'Right Hand', x: cx + 170, y: cy - 90, parent: 'r_elbow' },
    // Left Leg
    { id: 'l_knee', name: 'Left Knee', x: cx - 55, y: cy + 125, parent: 'pelvis' },
    { id: 'l_foot', name: 'Left Foot', x: cx - 100, y: cy + 220, parent: 'l_knee' },
    // Right Leg
    { id: 'r_knee', name: 'Right Knee', x: cx + 55, y: cy + 125, parent: 'pelvis' },
    { id: 'r_foot', name: 'Right Foot', x: cx + 100, y: cy + 220, parent: 'r_knee' }
  ];
}

export function cloneRig(rig) {
  if (!rig) return [];
  return rig.map((j) => ({ ...j }));
}

export function findJointById(rig, id) {
  if (!rig) return null;
  return rig.find((j) => j.id === id);
}

export function getDescendantJointIds(rig, parentId) {
  if (!rig) return [];
  const descendants = [];
  const queue = [parentId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = rig.filter((j) => j.parent === currentId);
    for (const child of children) {
      descendants.push(child.id);
      queue.push(child.id);
    }
  }

  return descendants;
}

/**
 * Translates the entire rig by dx, dy
 */
export function translateRig(rig, dx, dy) {
  if (!rig) return [];
  return rig.map((j) => ({
    ...j,
    x: j.x + dx,
    y: j.y + dy
  }));
}

/**
 * Translates a single joint, and optionally moves all its descendants along with it.
 */
export function translateJoint(rig, jointId, targetX, targetY, moveDescendants = true) {
  if (!rig) return [];
  const targetJoint = findJointById(rig, jointId);
  if (!targetJoint) return rig;

  const dx = targetX - targetJoint.x;
  const dy = targetY - targetJoint.y;

  // If moving root joint, move whole character/skeleton
  if (targetJoint.isRoot) {
    return translateRig(rig, dx, dy);
  }

  const descendantIds = moveDescendants ? new Set(getDescendantJointIds(rig, jointId)) : new Set();

  return rig.map((j) => {
    if (j.id === jointId) {
      return { ...j, x: targetX, y: targetY };
    }
    if (descendantIds.has(j.id)) {
      return { ...j, x: j.x + dx, y: j.y + dy };
    }
    return j;
  });
}

/**
 * Rotates a joint and all its descendants around its parent pivot joint.
 */
export function rotateJoint(rig, jointId, mouseX, mouseY) {
  if (!rig) return [];
  const joint = findJointById(rig, jointId);
  if (!joint || !joint.parent) return rig;

  const parentJoint = findJointById(rig, joint.parent);
  if (!parentJoint) return rig;

  const pivotX = parentJoint.x;
  const pivotY = parentJoint.y;

  // Current angle & length from pivot
  const curAngle = Math.atan2(joint.y - pivotY, joint.x - pivotX);
  const length = Math.hypot(joint.x - pivotX, joint.y - pivotY);

  // New angle toward mouse
  const newAngle = Math.atan2(mouseY - pivotY, mouseX - pivotX);
  const deltaAngle = newAngle - curAngle;

  const newJointX = pivotX + length * Math.cos(newAngle);
  const newJointY = pivotY + length * Math.sin(newAngle);

  const descendantIds = new Set(getDescendantJointIds(rig, jointId));

  return rig.map((j) => {
    if (j.id === jointId) {
      return { ...j, x: newJointX, y: newJointY };
    }
    if (descendantIds.has(j.id)) {
      const dx = j.x - pivotX;
      const dy = j.y - pivotY;
      const rx = dx * Math.cos(deltaAngle) - dy * Math.sin(deltaAngle);
      const ry = dx * Math.sin(deltaAngle) + dy * Math.cos(deltaAngle);
      return {
        ...j,
        x: pivotX + rx,
        y: pivotY + ry
      };
    }
    return j;
  });
}

/**
 * Adds a new joint directly on user's drawing connected to parentId
 */
export function addJoint(rig = [], parentId = null, x, y, name = 'Joint') {
  const isFirst = !rig || rig.length === 0;
  const id = 'joint_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  // If not first, determine parent: either explicit parentId, or last joint in chain
  const parent = isFirst ? null : (parentId || (rig.length > 0 ? rig[rig.length - 1].id : null));

  const newJoint = {
    id,
    name: isFirst ? 'Root Joint' : `${name} #${rig.length + 1}`,
    x,
    y,
    parent,
    isRoot: isFirst
  };

  return [...(rig || []), newJoint];
}

/**
 * Deletes a joint and reparents its descendants
 */
export function deleteJoint(rig, jointId) {
  if (!rig || rig.length === 0) return [];
  const jointToDelete = findJointById(rig, jointId);
  if (!jointToDelete) return rig;

  const parentId = jointToDelete.parent;
  return rig
    .filter((j) => j.id !== jointId)
    .map((j) => {
      if (j.parent === jointId) {
        return { ...j, parent: parentId, isRoot: parentId === null };
      }
      return j;
    });
}

/**
 * Renders bones and joints onto a canvas context directly over drawings.
 */
export function renderRig(ctx, rig, options = {}) {
  if (!rig || rig.length === 0) return;

  const {
    strokeColor = '#000000',
    boneWidth = 8,
    isGhost = false,
    ghostAlpha = 0.35,
    showHandles = true,
    activeTool = 'move', // 'draw' | 'move' | 'bones' | 'rotate'
    selectedJointId = null,
    hoverJointId = null
  } = options;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isGhost) {
    ctx.globalAlpha = ghostAlpha;
    ctx.strokeStyle = '#3b82f6';
    ctx.fillStyle = '#eff6ff';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = '#ffffff';
  }

  // 1. Draw Bones (lines connecting joints)
  ctx.lineWidth = boneWidth;
  for (const joint of rig) {
    if (joint.parent) {
      const parentJoint = findJointById(rig, joint.parent);
      if (parentJoint) {
        ctx.beginPath();
        ctx.moveTo(parentJoint.x, parentJoint.y);
        ctx.lineTo(joint.x, joint.y);
        ctx.stroke();
      }
    }
  }

  // 2. Draw Head (circle) if explicitly flagged as head (e.g. stickman preset)
  for (const joint of rig) {
    if (joint.isHead) {
      const r = joint.radius || 48;
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isGhost ? '#dbeafe' : '#ffffff';
      ctx.fill();
      ctx.stroke();

      if (!isGhost) {
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(joint.x - r * 0.3, joint.y - r * 0.1, Math.max(3, boneWidth * 0.6), 0, Math.PI * 2);
        ctx.arc(joint.x + r * 0.3, joint.y - r * 0.1, Math.max(3, boneWidth * 0.6), 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(joint.x, joint.y + r * 0.15, r * 0.35, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.lineWidth = Math.max(2, boneWidth * 0.5);
        ctx.stroke();
        ctx.lineWidth = boneWidth;
      }
    }
  }

  // 3. Draw Joint Handles (interactive controls for Move, Bones, Rotate)
  if (showHandles && !isGhost) {
    for (const joint of rig) {
      const isSelected = joint.id === selectedJointId;
      const isHovered = joint.id === hoverJointId;

      ctx.save();
      // Rotation Compass Gizmo around parent pivot
      if (activeTool === 'rotate' && (isSelected || isHovered) && joint.parent) {
        const parentJoint = findJointById(rig, joint.parent);
        if (parentJoint) {
          const len = Math.hypot(joint.x - parentJoint.x, joint.y - parentJoint.y);
          ctx.beginPath();
          ctx.arc(parentJoint.x, parentJoint.y, len, 0, Math.PI * 2);
          ctx.setLineDash([6, 6]);
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Joint Node Handle
      const handleRadius = joint.isRoot ? 11 : isSelected ? 10 : isHovered ? 9 : 7;
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, handleRadius, 0, Math.PI * 2);

      if (joint.isRoot) {
        // Root handle (gold / amber)
        ctx.fillStyle = '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
      } else if (activeTool === 'rotate') {
        // Rotation handle (orange)
        ctx.fillStyle = isSelected ? '#ea580c' : isHovered ? '#fb923c' : '#f97316';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
      } else if (activeTool === 'bones') {
        // Bone rigging handle (purple)
        ctx.fillStyle = isSelected ? '#7c3aed' : isHovered ? '#c084fc' : '#a855f7';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
      } else {
        // Move / Draw tool handle (blue/cyan)
        ctx.fillStyle = isSelected ? '#2563eb' : isHovered ? '#60a5fa' : '#3b82f6';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
      }

      ctx.fill();
      ctx.stroke();

      // Center white dot
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      ctx.restore();
    }
  }

  ctx.restore();
}
