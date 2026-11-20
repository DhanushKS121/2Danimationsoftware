/**
 * 2D Puppet & Object Rigging Engine
 * Allows selecting drawn artwork, converting to objects, adding bones,
 * moving individual points, rotating bones around parent joints,
 * and keyframe interpolation / tweening across center frames.
 */

/**
 * Creates initial skeleton with TWO points and a JOINT connecting them.
 * "in bone dont give a point. in bones give two point and joint"
 */
export function createInitialBones(x, y, width, height, id) {
  const isTall = height >= width;
  let p1X, p1Y, p2X, p2Y;

  if (isTall) {
    p1X = Math.round(x + width / 2);
    p1Y = Math.round(y + Math.max(16, height * 0.22));
    p2X = Math.round(x + width / 2);
    p2Y = Math.round(y + Math.min(height - 16, height * 0.78));
  } else {
    p1X = Math.round(x + Math.max(16, width * 0.22));
    p1Y = Math.round(y + height / 2);
    p2X = Math.round(x + Math.min(width - 16, width * 0.78));
    p2Y = Math.round(y + height / 2);
  }

  const p1Id = 'pt1_' + id;
  const p2Id = 'pt2_' + id;

  return [
    {
      id: p1Id,
      name: 'Point #1',
      x: p1X,
      y: p1Y,
      initX: p1X,
      initY: p1Y,
      isRoot: true,
      parent: null
    },
    {
      id: p2Id,
      name: 'Point #2',
      x: p2X,
      y: p2Y,
      initX: p2X,
      initY: p2Y,
      isRoot: false,
      parent: p1Id // Joint connecting Point 1 and Point 2!
    }
  ];
}

/**
 * Creates an object from a rectangular selection of the canvas
 */
export function createObjectFromCanvasSelection(canvas, rect, existingCount = 0) {
  const { minX, minY, width, height } = rect;
  if (width < 10 || height < 10) return null;

  // Offscreen canvas to crop selected pixels
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = width;
  cropCanvas.height = height;
  const cropCtx = cropCanvas.getContext('2d');

  // Draw the selected region
  cropCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

  // Make pure white background pixels in the cropped image transparent so only strokes remain
  const imgData = cropCtx.getImageData(0, 0, width, height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const darkness = Math.max(255 - r, 255 - g, 255 - b);

    if (darkness < 15) {
      // Pure white -> transparent
      data[i + 3] = 0;
    }
  }

  // Put filtered transparent pixels
  cropCtx.putImageData(imgData, 0, 0);

  const pivot = {
    x: minX + width / 2,
    y: minY + height / 2
  };

  const id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  // Default: one mid point (pivot / center), not considered for joint
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

  return {
    id,
    name: `Object #${existingCount + 1}`,
    x: minX,
    y: minY,
    width,
    height,
    image: cropCanvas.toDataURL(),
    imgElement: cropCanvas,
    rotation: 0,
    baseAngle: 0,
    pivot,
    bones: [midPoint]
  };
}

/**
 * Deep clones an array of puppet objects
 */
export function cloneObjects(objects) {
  if (!objects) return [];
  return objects.map((obj) => ({
    ...obj,
    pivot: { ...obj.pivot },
    bones: obj.bones ? obj.bones.map((b) => ({ ...b })) : []
  }));
}

/**
 * Translates an entire object and its bones
 */
export function translateObject(obj, dx, dy) {
  return {
    ...obj,
    x: obj.x + dx,
    y: obj.y + dy,
    pivot: {
      x: obj.pivot.x + dx,
      y: obj.pivot.y + dy
    },
    bones: obj.bones ? obj.bones.map((b) => ({
      ...b,
      x: b.x + dx,
      y: b.y + dy,
      initX: (b.initX !== undefined ? b.initX : b.x) + dx,
      initY: (b.initY !== undefined ? b.initY : b.y) + dy
    })) : []
  };
}

/**
 * MOVE: Moves only a single point / joint.
 * "in move only move points"
 */
export function moveJoint(obj, jointId, newX, newY) {
  if (!obj || !obj.bones) return obj;

  const target = obj.bones.find((b) => b.id === jointId);
  if (!target) return obj;

  // If moving the mid point, translate entire object & its points
  if (target.isMidPoint) {
    const dx = newX - target.x;
    const dy = newY - target.y;
    return translateObject(obj, dx, dy);
  }

  const isRoot = target.isRoot;

  const updatedBones = obj.bones.map((b) => {
    if (b.id === jointId) {
      return {
        ...b,
        x: newX,
        y: newY,
        initX: b.initX !== undefined ? b.initX : b.x,
        initY: b.initY !== undefined ? b.initY : b.y
      };
    }
    return b;
  });

  return {
    ...obj,
    pivot: isRoot ? { x: newX, y: newY } : obj.pivot,
    bones: updatedBones
  };
}

/**
 * ROTATION: Rotates a bone around its parent joint (Forward Kinematics).
 * "in rotation bone should rotate"
 */
export function rotateBone(obj, jointId, targetX, targetY) {
  if (!obj || !obj.bones) return obj;

  const joint = obj.bones.find((b) => b.id === jointId);
  if (!joint) return obj;

  // If root joint, rotate whole object around pivot
  if (joint.isRoot || !joint.parent) {
    return rotateObject(obj, targetX, targetY);
  }

  const parentJoint = obj.bones.find((b) => b.id === joint.parent);
  if (!parentJoint) return obj;

  // Angle from parent joint to target cursor
  const targetAngle = Math.atan2(targetY - parentJoint.y, targetX - parentJoint.x);
  const currentAngle = Math.atan2(joint.y - parentJoint.y, joint.x - parentJoint.x);
  const deltaAngle = targetAngle - currentAngle;

  // Maintain bone segment length
  const boneLength = Math.hypot(joint.x - parentJoint.x, joint.y - parentJoint.y);

  const newJointX = parentJoint.x + boneLength * Math.cos(targetAngle);
  const newJointY = parentJoint.y + boneLength * Math.sin(targetAngle);

  // Helper to rotate point around center
  const rotatePointAround = (px, py, cx, cy, angle) => {
    const dx = px - cx;
    const dy = py - cy;
    return {
      x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: cy + dx * Math.sin(angle) + dy * Math.cos(angle)
    };
  };

  // Find all descendants of jointId
  const getDescendants = (parentId, allBones) => {
    const directChildren = allBones.filter((b) => b.parent === parentId);
    let descendants = [...directChildren];
    for (const child of directChildren) {
      descendants = descendants.concat(getDescendants(child.id, allBones));
    }
    return descendants;
  };

  const descendantIds = new Set(getDescendants(jointId, obj.bones).map((b) => b.id));

  const updatedBones = obj.bones.map((b) => {
    if (b.id === jointId) {
      return {
        ...b,
        x: newJointX,
        y: newJointY,
        initX: b.initX !== undefined ? b.initX : b.x,
        initY: b.initY !== undefined ? b.initY : b.y
      };
    }
    if (descendantIds.has(b.id)) {
      const rot = rotatePointAround(b.x, b.y, parentJoint.x, parentJoint.y, deltaAngle);
      return {
        ...b,
        x: rot.x,
        y: rot.y,
        initX: b.initX !== undefined ? b.initX : b.x,
        initY: b.initY !== undefined ? b.initY : b.y
      };
    }
    return b;
  });

  return {
    ...obj,
    bones: updatedBones
  };
}

/**
 * Rotates entire object around pivot
 */
export function rotateObject(obj, targetX, targetY) {
  const pivot = obj.pivot;
  const targetAngle = Math.atan2(targetY - pivot.y, targetX - pivot.x);
  const deltaAngle = targetAngle - (obj.lastDragAngle || targetAngle);

  const newRotation = (obj.rotation || 0) + deltaAngle;

  // Rotate attached bones around pivot
  const newBones = obj.bones ? obj.bones.map((b) => {
    if (b.isRoot) return b;
    const dx = b.x - pivot.x;
    const dy = b.y - pivot.y;
    const rx = dx * Math.cos(deltaAngle) - dy * Math.sin(deltaAngle);
    const ry = dx * Math.sin(deltaAngle) + dy * Math.cos(deltaAngle);
    return {
      ...b,
      x: pivot.x + rx,
      y: pivot.y + ry,
      initX: b.initX !== undefined ? b.initX : b.x,
      initY: b.initY !== undefined ? b.initY : b.y
    };
  }) : [];

  return {
    ...obj,
    rotation: newRotation,
    lastDragAngle: targetAngle,
    bones: newBones
  };
}

/**
 * Adds a bone joint to an object
 */
export function addBoneToObject(obj, x, y) {
  const bones = obj.bones || [];
  const isFirst = bones.length === 0;

  const newJoint = {
    id: 'joint_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: isFirst ? 'Pivot Joint' : `Bone Joint #${bones.length + 1}`,
    x,
    y,
    initX: x,
    initY: y,
    parent: isFirst ? null : (bones[bones.length - 1] ? bones[bones.length - 1].id : null),
    isRoot: isFirst
  };

  const updatedBones = [...bones, newJoint];
  const newPivot = isFirst ? { x, y } : obj.pivot;

  return {
    ...obj,
    pivot: newPivot,
    bones: updatedBones
  };
}

/**
 * POINT TOOL: Adds an individual point on the drawing.
 * "in point we add points."
 */
export function addPointToObject(obj, x, y) {
  if (!obj) return obj;
  const bones = obj.bones || [];
  const userPoints = bones.filter((b) => !b.isMidPoint);

  const newPoint = {
    id: 'pt_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: `Point #${userPoints.length + 1}`,
    x,
    y,
    initX: x,
    initY: y,
    isRoot: false,
    isMidPoint: false,
    parent: null // standalone point waiting to be jointed!
  };

  return {
    ...obj,
    bones: [...bones, newPoint]
  };
}

/**
 * JOINT TOOL: Connects two points together with a joint / bone segment.
 * "in joint we tap bw point that point should joint"
 */
export function jointTwoPoints(obj, pointIdA, pointIdB) {
  if (!obj || !obj.bones || pointIdA === pointIdB) return obj;
  const ptA = obj.bones.find((b) => b.id === pointIdA);
  const ptB = obj.bones.find((b) => b.id === pointIdB);
  if (!ptA || !ptB) return obj;

  // Mid point is NOT considered for joint: "dont consider it for joint"
  if (ptA.isMidPoint || ptB.isMidPoint) return obj;

  // If already connected directly, nothing to do
  if (ptB.parent === ptA.id || ptA.parent === ptB.id) return obj;

  // Helper to check if ancestor to prevent cycle
  const isAncestor = (ancestorId, childId, allBones) => {
    let cur = allBones.find((b) => b.id === childId);
    while (cur && cur.parent) {
      if (cur.parent === ancestorId) return true;
      cur = allBones.find((b) => b.id === cur.parent);
    }
    return false;
  };

  let parentId = ptA.id;
  let childId = ptB.id;

  if (isAncestor(ptB.id, ptA.id, obj.bones)) {
    // ptB is already an ancestor of ptA; ptA must be child
    parentId = ptB.id;
    childId = ptA.id;
  } else if (ptB.isRoot || (ptB.parent && !ptA.parent)) {
    parentId = ptB.id;
    childId = ptA.id;
  }

  const updatedBones = obj.bones.map((b) => {
    if (b.id === childId) {
      return {
        ...b,
        parent: parentId,
        isRoot: false
      };
    }
    return b;
  });

  return {
    ...obj,
    bones: updatedBones
  };
}

/**
 * Detects if a coordinate (x, y) is tapped between two existing points.
 * "in joint we tap bw point that point should joint"
 */
export function findPointsToJointBetween(x, y, bones, maxDist = 45) {
  if (!bones) return null;
  // Exclude mid point: "dont consider it for joint"
  const jointableBones = bones.filter((b) => !b.isMidPoint);
  if (jointableBones.length < 2) return null;
  let bestPair = null;
  let bestDist = maxDist;

  for (let i = 0; i < jointableBones.length; i++) {
    for (let j = i + 1; j < jointableBones.length; j++) {
      const pA = jointableBones[i];
      const pB = jointableBones[j];

      // Check if already directly jointed
      if (pA.parent === pB.id || pB.parent === pA.id) continue;

      const x1 = pA.x, y1 = pA.y;
      const x2 = pB.x, y2 = pB.y;
      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 < 64) continue; // too close

      // Projection parameter t
      const t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / l2;
      // Must be between the two points (not beyond endpoints)
      if (t >= 0.08 && t <= 0.92) {
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const dist = Math.hypot(x - projX, y - projY);
        if (dist < bestDist) {
          bestDist = dist;
          bestPair = { pA, pB, t, projX, projY, dist };
        }
      }
    }
  }
  return bestPair;
}

/**
 * KEYFRAME TWEENING / IN-BETWEENING:
 * Interpolates objects between keyframe A and keyframe B for center frames.
 * "if i change move or rotaion in frame 5 centre frames should have movement"
 */
export function interpolateObjects(objsA, objsB, t) {
  if (!objsA || objsA.length === 0) return objsB ? cloneObjects(objsB) : [];
  if (!objsB || objsB.length === 0) return cloneObjects(objsA);

  return objsA.map((objA) => {
    const objB = objsB.find((o) => o.id === objA.id);
    if (!objB) return { ...objA };

    // Interpolate position
    const interpX = objA.x + (objB.x - objA.x) * t;
    const interpY = objA.y + (objB.y - objA.y) * t;

    // Interpolate rotation (shortest circular path)
    const rotA = objA.rotation || 0;
    const rotB = objB.rotation || 0;
    const diff = ((((rotB - rotA) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const interpRot = rotA + diff * t;

    // Interpolate pivot
    const interpPivot = {
      x: objA.pivot.x + (objB.pivot.x - objA.pivot.x) * t,
      y: objA.pivot.y + (objB.pivot.y - objA.pivot.y) * t
    };

    // Interpolate bones / points
    const interpBones = (objA.bones || []).map((boneA) => {
      const boneB = (objB.bones || []).find((b) => b.id === boneA.id);
      if (!boneB) return { ...boneA };

      return {
        ...boneA,
        x: boneA.x + (boneB.x - boneA.x) * t,
        y: boneA.y + (boneB.y - boneA.y) * t,
        initX: boneA.initX !== undefined ? boneA.initX : boneA.x,
        initY: boneA.initY !== undefined ? boneA.initY : boneA.y
      };
    });

    return {
      ...objA,
      x: interpX,
      y: interpY,
      rotation: interpRot,
      pivot: interpPivot,
      bones: interpBones
    };
  });
}

/**
 * Moving Least Squares (MLS) deformation on the drawn image.
 * Transforms the drawing strokes according to control points (bones/joints).
 */
function drawTexturedTriangle(ctx, img, p0, p1, p2) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p0.dstX, p0.dstY);
  ctx.lineTo(p1.dstX, p1.dstY);
  ctx.lineTo(p2.dstX, p2.dstY);
  ctx.closePath();
  ctx.clip();

  const s0x = p0.srcX, s0y = p0.srcY;
  const s1x = p1.srcX, s1y = p1.srcY;
  const s2x = p2.srcX, s2y = p2.srcY;

  const d0x = p0.dstX, d0y = p0.dstY;
  const d1x = p1.dstX, d1y = p1.dstY;
  const d2x = p2.dstX, d2y = p2.dstY;

  const denom = (s0x - s2x) * (s1y - s2y) - (s1x - s2x) * (s0y - s2y);
  if (Math.abs(denom) > 0.0001) {
    const a = ((d0x - d2x) * (s1y - s2y) - (d1x - d2x) * (s0y - s2y)) / denom;
    const b = ((d0y - d2y) * (s1y - s2y) - (d1y - d2y) * (s0y - s2y)) / denom;
    const c = ((s0x - s2x) * (d1x - d2x) - (s1x - s2x) * (d0x - d2x)) / denom;
    const d = ((s0x - s2x) * (d1y - d2y) - (s1x - s2x) * (d0y - d2y)) / denom;
    const e = d2x - a * s2x - c * s2y;
    const f = d2y - b * s2x - d * s2y;

    ctx.transform(a, b, c, d, e, f);
    ctx.drawImage(img, 0, 0);
  }
  ctx.restore();
}

function deformImageMLS(ctx, img, obj, P, Q, gridSteps = 8) {
  const { width, height } = obj;
  const stepX = width / gridSteps;
  const stepY = height / gridSteps;

  const grid = [];
  for (let gy = 0; gy <= gridSteps; gy++) {
    const row = [];
    for (let gx = 0; gx <= gridSteps; gx++) {
      const vx = obj.x + gx * stepX;
      const vy = obj.y + gy * stepY;

      let wSum = 0;
      let pStarX = 0, pStarY = 0;
      let qStarX = 0, qStarY = 0;

      const weights = new Float32Array(P.length);
      for (let i = 0; i < P.length; i++) {
        const d2 = (P[i].x - vx) * (P[i].x - vx) + (P[i].y - vy) * (P[i].y - vy);
        const w = 1 / (d2 + 100);
        weights[i] = w;
        wSum += w;
        pStarX += w * P[i].x;
        pStarY += w * P[i].y;
        qStarX += w * Q[i].x;
        qStarY += w * Q[i].y;
      }

      pStarX /= wSum;
      pStarY /= wSum;
      qStarX /= wSum;
      qStarY /= wSum;

      let m00 = 0, m01 = 0, m10 = 0, m11 = 0;
      let p00 = 0, p01 = 0, p11 = 0;

      for (let i = 0; i < P.length; i++) {
        const w = weights[i];
        const px = P[i].x - pStarX;
        const py = P[i].y - pStarY;
        const qx = Q[i].x - qStarX;
        const qy = Q[i].y - qStarY;

        p00 += w * px * px;
        p01 += w * px * py;
        p11 += w * py * py;

        m00 += w * qx * px;
        m01 += w * qx * py;
        m10 += w * qy * px;
        m11 += w * qy * py;
      }

      const det = p00 * p11 - p01 * p01;
      let defX = vx, defY = vy;

      if (Math.abs(det) > 0.0001) {
        const inv00 = p11 / det;
        const inv01 = -p01 / det;
        const inv11 = p00 / det;

        const a00 = m00 * inv00 + m01 * inv01;
        const a01 = m00 * inv01 + m01 * inv11;
        const a10 = m10 * inv00 + m11 * inv01;
        const a11 = m10 * inv01 + m11 * inv11;

        const dx = vx - pStarX;
        const dy = vy - pStarY;

        defX = qStarX + a00 * dx + a01 * dy;
        defY = qStarY + a10 * dx + a11 * dy;
      }

      row.push({
        srcX: gx * stepX,
        srcY: gy * stepY,
        dstX: defX - obj.pivot.x,
        dstY: defY - obj.pivot.y
      });
    }
    grid.push(row);
  }

  for (let gy = 0; gy < gridSteps; gy++) {
    for (let gx = 0; gx < gridSteps; gx++) {
      const p00 = grid[gy][gx];
      const p10 = grid[gy][gx + 1];
      const p01 = grid[gy + 1][gx];
      const p11 = grid[gy + 1][gx + 1];

      drawTexturedTriangle(ctx, img, p00, p10, p01);
      drawTexturedTriangle(ctx, img, p10, p11, p01);
    }
  }
}

/**
 * Renders all objects and their transformed drawings onto a canvas context
 */
export function renderPuppetObjects(ctx, objects, imageCache = {}, options = {}) {
  if (!objects || objects.length === 0) return;

  const {
    showBones = true,
    showHandles = true,
    activeTool = 'move',
    selectedObjectId = null,
    selectedJointId = null,
    hoverJointId = null,
    boneWidth = 6,
    boneColor = '#3b82f6'
  } = options;

  for (const obj of objects) {
    if (!obj || !obj.image) continue;

    const isSelectedObj = obj.id === selectedObjectId;

    ctx.save();

    // 1. Apply Transformation directly to the Drawing!
    ctx.translate(obj.pivot.x, obj.pivot.y);
    ctx.rotate(obj.rotation || 0);

    const drawOffsetX = obj.x - obj.pivot.x;
    const drawOffsetY = obj.y - obj.pivot.y;

    const imgToDraw = obj.imgElement || imageCache[obj.id];

    // Check if joints have moved from init positions to determine MLS deformation
    const bones = obj.bones || [];
    let hasDeformedBones = false;
    const restPoints = [];
    const defPoints = [];

    if (bones.length >= 2) {
      for (const b of bones) {
        const initX = b.initX !== undefined ? b.initX : b.x;
        const initY = b.initY !== undefined ? b.initY : b.y;
        restPoints.push({ x: initX, y: initY });
        defPoints.push({ x: b.x, y: b.y });
        if (Math.hypot(b.x - initX, b.y - initY) > 0.5) {
          hasDeformedBones = true;
        }
      }
    }

    if (imgToDraw) {
      try {
        if (hasDeformedBones && restPoints.length >= 2) {
          deformImageMLS(ctx, imgToDraw, obj, restPoints, defPoints, 8);
        } else {
          ctx.drawImage(imgToDraw, drawOffsetX, drawOffsetY, obj.width, obj.height);
        }
      } catch (e) {
        ctx.drawImage(imgToDraw, drawOffsetX, drawOffsetY, obj.width, obj.height);
      }
    } else {
      const img = new Image();
      img.onload = () => {
        imageCache[obj.id] = img;
      };
      img.src = obj.image;
      imageCache[obj.id] = img;
      if (img.complete) {
        try {
          if (hasDeformedBones && restPoints.length >= 2) {
            deformImageMLS(ctx, img, obj, restPoints, defPoints, 8);
          } else {
            ctx.drawImage(img, drawOffsetX, drawOffsetY, obj.width, obj.height);
          }
        } catch (e) {}
      }
    }

    // Selected object bounding outline
    if (isSelectedObj && showHandles) {
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(drawOffsetX - 2, drawOffsetY - 2, obj.width + 4, obj.height + 4);
    }

    ctx.restore();

    // 2. Render Bones & Joint Handles on top of the Drawing (if in editor mode)
    if (showBones && obj.bones && obj.bones.length > 0 && showHandles) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Draw bone segments
      ctx.lineWidth = Math.max(3, boneWidth * 0.8);
      ctx.strokeStyle = isSelectedObj ? '#3b82f6' : 'rgba(59, 130, 246, 0.6)';

      for (const joint of obj.bones) {
        if (joint.parent) {
          const parentJoint = obj.bones.find((b) => b.id === joint.parent);
          if (parentJoint) {
            ctx.beginPath();
            ctx.moveTo(parentJoint.x, parentJoint.y);
            ctx.lineTo(joint.x, joint.y);
            ctx.stroke();
          }
        }
      }

      // Draw joint handles (clickable points)
      const jointFirstPointId = options.jointFirstPointId;
      for (const joint of obj.bones) {
        const isJointFirst = joint.id === jointFirstPointId;
        const isSelectedJoint = joint.id === selectedJointId;
        const isHovered = joint.id === hoverJointId;
        const radius = isJointFirst ? 12 : joint.isRoot ? 11 : isSelectedJoint ? 10 : isHovered ? 9 : 7;

        ctx.beginPath();
        ctx.arc(joint.x, joint.y, radius, 0, Math.PI * 2);

        if (joint.isMidPoint) {
          ctx.fillStyle = '#f59e0b'; // Gold midpoint anchor (not for joint)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
        } else if (isJointFirst) {
          ctx.fillStyle = '#9333ea'; // Purple for active joint source
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
        } else if (joint.isRoot) {
          ctx.fillStyle = '#f59e0b'; // Gold pivot joint
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
        } else if (activeTool === 'rotate') {
          ctx.fillStyle = isSelectedJoint ? '#ea580c' : '#f97316'; // Orange rotation joint
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.2;
        } else if (activeTool === 'joint') {
          ctx.fillStyle = isSelectedJoint ? '#9333ea' : isHovered ? '#a855f7' : '#7c3aed'; // Purple joint points
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
        } else if (activeTool === 'point') {
          ctx.fillStyle = isSelectedJoint ? '#059669' : isHovered ? '#34d399' : '#10b981'; // Green add point mode
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
        } else {
          ctx.fillStyle = isSelectedJoint ? '#1d4ed8' : '#3b82f6'; // Blue move point
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
        }

        ctx.fill();
        ctx.stroke();

        if (isJointFirst) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(joint.x, joint.y, 16, 0, Math.PI * 2);
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }

        // Center dot
        ctx.beginPath();
        ctx.arc(joint.x, joint.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      // Rotation helper compass arc if rotating this bone
      if (activeTool === 'rotate' && isSelectedObj) {
        const activeJoint = obj.bones.find((b) => b.id === selectedJointId);
        const pivotPt = activeJoint && activeJoint.parent
          ? obj.bones.find((b) => b.id === activeJoint.parent)
          : obj.pivot;

        if (pivotPt) {
          ctx.beginPath();
          const dist = activeJoint
            ? Math.max(30, Math.hypot(activeJoint.x - pivotPt.x, activeJoint.y - pivotPt.y))
            : Math.max(40, Math.hypot(obj.width / 2, obj.height / 2));
          ctx.arc(pivotPt.x, pivotPt.y, dist, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }
}
