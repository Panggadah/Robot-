export interface LinkConfig {
  id: number;
  name: string;
  codeName: string;
  length: number; // in mm
  minAngle: number; // in degrees
  maxAngle: number; // in degrees
  currentAngle: number; // in degrees
  axis: 'yaw' | 'pitch' | 'roll';
  description: string;
  color: string;
}

export interface DHParameter {
  joint: number;
  theta: number; // degrees
  d: number; // mm
  a: number; // mm
  alpha: number; // degrees
}

export interface Joint3DPoint {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
}

export interface EndEffectorCoords {
  x: number;
  y: number;
  z: number;
  reach: number;
  roll: number; // degrees
  pitch: number; // degrees
  yaw: number; // degrees
  quaternion: {
    w: number;
    x: number;
    y: number;
    z: number;
  };
}

export interface KinematicsResult {
  tcp: EndEffectorCoords;
  joints: Joint3DPoint[];
  dhTable: DHParameter[];
  transformationMatrix: number[][]; // 4x4 matrix
  individualMatrices: number[][][]; // 5 of 4x4 matrices
  maxReach: number;
}

export interface Waypoint {
  id: string;
  name: string;
  timestamp: string;
  angles: [number, number, number, number, number];
  tcp: {
    x: number;
    y: number;
    z: number;
  };
}

export interface RobotArmPreset {
  name: string;
  description: string;
  lengths: [number, number, number, number, number];
  angleRanges: Array<{ min: number; max: number }>;
}

export interface AnglePreset {
  name: string;
  iconName: string;
  angles: [number, number, number, number, number];
}
