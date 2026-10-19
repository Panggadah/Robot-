import * as THREE from 'three';
import { DHParameter, EndEffectorCoords, Joint3DPoint, KinematicsResult, LinkConfig } from '../types/robot';

/**
 * Standard 4x4 matrix multiplication
 */
export function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const result: number[][] = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];

  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

/**
 * Converts degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Converts radians to degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Creates a standard Denavit-Hartenberg (DH) Transformation Matrix
 * T = Rot_z(theta) * Trans_z(d) * Trans_x(a) * Rot_x(alpha)
 */
export function createDHMatrix(thetaDeg: number, d: number, a: number, alphaDeg: number): number[][] {
  const theta = degToRad(thetaDeg);
  const alpha = degToRad(alphaDeg);

  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);

  return [
    [ct, -st * ca, st * sa, a * ct],
    [st, ct * ca, -ct * sa, a * st],
    [0, sa, ca, d],
    [0, 0, 0, 1],
  ];
}

/**
 * Converts 3x3 rotation matrix to Roll, Pitch, Yaw (ZYX convention) in degrees
 */
export function extractEulerAngles(rot: number[][]): { roll: number; pitch: number; yaw: number } {
  // rot[row][col]
  const r11 = rot[0][0];
  const r21 = rot[1][0];
  const r31 = rot[2][0];
  const r32 = rot[2][1];
  const r33 = rot[2][2];

  let pitch = -Math.asin(Math.max(-1, Math.min(1, r31)));
  let roll = 0;
  let yaw = 0;

  if (Math.abs(r31) < 0.99999) {
    roll = Math.atan2(r32, r33);
    yaw = Math.atan2(r21, r11);
  } else {
    // Gimbal lock
    roll = 0;
    yaw = Math.atan2(-rot[0][1], rot[1][1]);
  }

  return {
    roll: Number(radToDeg(roll).toFixed(2)),
    pitch: Number(radToDeg(pitch).toFixed(2)),
    yaw: Number(radToDeg(yaw).toFixed(2)),
  };
}

/**
 * Converts 3x3 rotation matrix to Quaternion
 */
export function extractQuaternion(rot: number[][]): { w: number; x: number; y: number; z: number } {
  const m00 = rot[0][0], m01 = rot[0][1], m02 = rot[0][2];
  const m10 = rot[1][0], m11 = rot[1][1], m12 = rot[1][2];
  const m20 = rot[2][0], m21 = rot[2][1], m22 = rot[2][2];

  const tr = m00 + m11 + m22;
  let qw = 0, qx = 0, qy = 0, qz = 0;

  if (tr > 0) {
    const s = 0.5 / Math.sqrt(tr + 1.0);
    qw = 0.25 / s;
    qx = (m21 - m12) * s;
    qy = (m02 - m20) * s;
    qz = (m10 - m01) * s;
  } else if (m00 > m11 && m00 > m22) {
    const s = 2.0 * Math.sqrt(1.0 + m00 - m11 - m22);
    qw = (m21 - m12) / s;
    qx = 0.25 * s;
    qy = (m01 + m10) / s;
    qz = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = 2.0 * Math.sqrt(1.0 + m11 - m00 - m22);
    qw = (m02 - m20) / s;
    qx = (m01 + m10) / s;
    qy = 0.25 * s;
    qz = (m12 + m21) / s;
  } else {
    const s = 2.0 * Math.sqrt(1.0 + m22 - m00 - m11);
    qw = (m10 - m01) / s;
    qx = (m02 + m20) / s;
    qy = (m12 + m21) / s;
    qz = 0.25 * s;
  }

  return {
    w: Number(qw.toFixed(4)),
    x: Number(qx.toFixed(4)),
    y: Number(qy.toFixed(4)),
    z: Number(qz.toFixed(4)),
  };
}

/**
 * Calculates Forward Kinematics for the 5-DOF Articulated Robot Arm
 * Links:
 * Link 1: Base turntable (Yaw theta1), height L1
 * Link 2: Shoulder (Pitch theta2), length L2
 * Link 3: Elbow (Pitch theta3), length L3
 * Link 4: Wrist Pitch (Pitch theta4), length L4
 * Link 5: Wrist Roll (Roll theta5), length L5 to TCP tip
 */
export function calculateForwardKinematics(links: LinkConfig[]): KinematicsResult {
  const l1 = links[0].length;
  const l2 = links[1].length;
  const l3 = links[2].length;
  const l4 = links[3].length;
  const l5 = links[4].length;

  const th1 = links[0].currentAngle;
  const th2 = links[1].currentAngle;
  const th3 = links[2].currentAngle;
  const th4 = links[3].currentAngle;
  const th5 = links[4].currentAngle;

  // Standard DH Parameters definition for 5-DOF articulated robot
  const dhTable: DHParameter[] = [
    { joint: 1, theta: th1, d: l1, a: 0, alpha: 90 },
    { joint: 2, theta: th2, d: 0, a: l2, alpha: 0 },
    { joint: 3, theta: th3, d: 0, a: l3, alpha: 0 },
    { joint: 4, theta: th4, d: 0, a: l4, alpha: 90 },
    { joint: 5, theta: th5, d: l5, a: 0, alpha: 0 },
  ];

  // Calculate individual transformation matrices A_i
  const individualMatrices: number[][][] = dhTable.map((dh) =>
    createDHMatrix(dh.theta, dh.d, dh.a, dh.alpha)
  );

  // Compute intermediate cumulative matrices T_0^i to obtain exact joint 3D positions
  let cumulative = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];

  const cumulativeMatrices: number[][][] = [cumulative];

  for (let i = 0; i < individualMatrices.length; i++) {
    cumulative = multiplyMatrices(cumulative, individualMatrices[i]);
    cumulativeMatrices.push(cumulative);
  }

  // Final transformation matrix T_0^5
  const T = cumulative;

  // Direct analytical 3D joint positions aligned with standard Three.js world axes:
  // Base at origin (0, 0, 0)
  // Three.js: Y is up, X is right, Z is front
  // th1: Yaw around Y-axis
  // th2: Pitch up/down from vertical or horizontal
  // Cumulative pitch in the sagittal arm plane = th2 + th3 + th4
  const t1Rad = degToRad(th1);
  const t2Rad = degToRad(th2);
  const t3Rad = degToRad(th3);
  const t4Rad = degToRad(th4);

  // Sagittal plane coordinates (r = radial distance along ground, y = vertical height)
  // Joint 0: Origin
  const j0: Joint3DPoint = { id: 0, name: 'Base Origin (J0)', x: 0, y: 0, z: 0 };

  // Joint 1: Base Height / Shoulder Pivot (J1)
  const j1: Joint3DPoint = { id: 1, name: 'Shoulder Joint (J1)', x: 0, y: l1, z: 0 };

  // Joint 2: Elbow Pivot (J2)
  // Arm extends with angle th2 (measured from horizontal/vertical)
  // Let angle 0 be pointing up/forward:
  // Using standard robotics pitch: theta2 is tilt from vertical
  // when th2 = 0, arm is upright; when th2 = 90 deg, arm is horizontal
  const a2 = t2Rad;
  const r2 = l2 * Math.sin(a2);
  const y2 = l1 + l2 * Math.cos(a2);
  const j2: Joint3DPoint = {
    id: 2,
    name: 'Elbow Joint (J2)',
    x: Number((r2 * Math.cos(t1Rad)).toFixed(2)),
    y: Number(y2.toFixed(2)),
    z: Number((r2 * Math.sin(t1Rad)).toFixed(2)),
  };

  // Joint 3: Wrist Pitch (J3)
  const a3 = a2 + t3Rad;
  const r3 = r2 + l3 * Math.sin(a3);
  const y3 = y2 + l3 * Math.cos(a3);
  const j3: Joint3DPoint = {
    id: 3,
    name: 'Wrist Pitch Joint (J3)',
    x: Number((r3 * Math.cos(t1Rad)).toFixed(2)),
    y: Number(y3.toFixed(2)),
    z: Number((r3 * Math.sin(t1Rad)).toFixed(2)),
  };

  // Joint 4: Wrist Roll / Tool Mount (J4)
  const a4 = a3 + t4Rad;
  const r4 = r3 + l4 * Math.sin(a4);
  const y4 = y3 + l4 * Math.cos(a4);
  const j4: Joint3DPoint = {
    id: 4,
    name: 'Wrist Roll Joint (J4)',
    x: Number((r4 * Math.cos(t1Rad)).toFixed(2)),
    y: Number(y4.toFixed(2)),
    z: Number((r4 * Math.sin(t1Rad)).toFixed(2)),
  };

  // Joint 5: Tool Center Point / End Effector Tip (J5 / TCP)
  const r5 = r4 + l5 * Math.sin(a4);
  const y5 = y4 + l5 * Math.cos(a4);
  const j5: Joint3DPoint = {
    id: 5,
    name: 'End Effector / TCP (J5)',
    x: Number((r5 * Math.cos(t1Rad)).toFixed(2)),
    y: Number(y5.toFixed(2)),
    z: Number((r5 * Math.sin(t1Rad)).toFixed(2)),
  };

  // Total Reach distance from base center
  const reach = Number(Math.sqrt(j5.x * j5.x + j5.y * j5.y + j5.z * j5.z).toFixed(2));
  const maxReach = l1 + l2 + l3 + l4 + l5;

  // Extract orientation from cumulative rotation matrix
  const rot3x3 = [
    [T[0][0], T[0][1], T[0][2]],
    [T[1][0], T[1][1], T[1][2]],
    [T[2][0], T[2][1], T[2][2]],
  ];

  const euler = extractEulerAngles(rot3x3);
  const quat = extractQuaternion(rot3x3);

  const tcpCoords: EndEffectorCoords = {
    x: j5.x,
    y: j5.y,
    z: j5.z,
    reach,
    roll: euler.roll,
    pitch: euler.pitch,
    yaw: euler.yaw,
    quaternion: quat,
  };

  return {
    tcp: tcpCoords,
    joints: [j0, j1, j2, j3, j4, j5],
    dhTable,
    transformationMatrix: T,
    individualMatrices,
    maxReach,
  };
}

/**
 * Three.js Object3D hierarchy updater helper for precise procedural mesh placement
 */
export function updateRobotJointTransforms(
  links: LinkConfig[],
  joints: {
    baseGroup: THREE.Group;
    joint1: THREE.Group;
    joint2: THREE.Group;
    joint3: THREE.Group;
    joint4: THREE.Group;
    joint5: THREE.Group;
    tcpTip: THREE.Group;
  }
) {
  const l1 = links[0].length;
  const l2 = links[1].length;
  const l3 = links[2].length;
  const l4 = links[3].length;
  const l5 = links[4].length;

  const th1 = degToRad(links[0].currentAngle);
  const th2 = degToRad(links[1].currentAngle);
  const th3 = degToRad(links[2].currentAngle);
  const th4 = degToRad(links[3].currentAngle);
  const th5 = degToRad(links[4].currentAngle);

  // Joint 1: Base Turntable rotates around Y (Yaw)
  joints.joint1.rotation.y = th1;
  joints.joint1.position.set(0, l1, 0);

  // Joint 2: Shoulder rotates around Z (Pitch)
  joints.joint2.rotation.z = th2;

  // Link 2 extends upwards/along Y by l2 to Joint 3 (Elbow)
  joints.joint3.position.set(0, l2, 0);
  joints.joint3.rotation.z = th3;

  // Link 3 extends by l3 to Joint 4 (Wrist pitch)
  joints.joint4.position.set(0, l3, 0);
  joints.joint4.rotation.z = th4;

  // Link 4 extends by l4 to Joint 5 (Wrist roll)
  joints.joint5.position.set(0, l4, 0);
  joints.joint5.rotation.y = th5; // roll along longitudinal axis

  // Link 5 extends to Tool Tip
  joints.tcpTip.position.set(0, l5, 0);
}
