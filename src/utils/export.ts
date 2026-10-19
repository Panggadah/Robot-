import { KinematicsResult, LinkConfig, Waypoint } from '../types/robot';

/**
 * Downloads a text content as a file in the browser safely without external dependencies
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a CSV export file of the 5-DOF robot arm state
 */
export function exportKinematicsToCSV(
  links: LinkConfig[],
  result: KinematicsResult,
  waypoints: Waypoint[] = []
) {
  const timestamp = new Date().toISOString();
  const rows: string[] = [];

  // Header info
  rows.push('# 5-DOF ROBOT ARM KINEMATICS DATA EXPORT');
  rows.push(`# Generated: ${timestamp}`);
  rows.push('# Coordinate System: X=Right, Y=Up, Z=Depth (Forward)');
  rows.push('');

  // 1. END EFFECTOR (TCP) SUMMARY
  rows.push('--- END EFFECTOR (TCP) COORDINATES ---');
  rows.push('Parameter,Value,Unit,Description');
  rows.push(`TCP_X,${result.tcp.x},mm,X coordinate (Sumbu X)`);
  rows.push(`TCP_Y,${result.tcp.y},mm,Y coordinate / Height (Sumbu Y / Ketinggian)`);
  rows.push(`TCP_Z,${result.tcp.z},mm,Z coordinate / Depth (Sumbu Z / Kedalaman)`);
  rows.push(`Total_Reach,${result.tcp.reach},mm,Direct Euclidean Distance from Origin`);
  rows.push(`Max_Reach_Envelope,${result.maxReach},mm,Maximum Theoretical Reach`);
  rows.push(`Orientation_Roll,${result.tcp.roll},deg,Euler Angle Roll (phi)`);
  rows.push(`Orientation_Pitch,${result.tcp.pitch},deg,Euler Angle Pitch (theta)`);
  rows.push(`Orientation_Yaw,${result.tcp.yaw},deg,Euler Angle Yaw (psi)`);
  rows.push(`Quat_w,${result.tcp.quaternion.w},unitless,Quaternion scalar w`);
  rows.push(`Quat_x,${result.tcp.quaternion.x},unitless,Quaternion vector x`);
  rows.push(`Quat_y,${result.tcp.quaternion.y},unitless,Quaternion vector y`);
  rows.push(`Quat_z,${result.tcp.quaternion.z},unitless,Quaternion vector z`);
  rows.push('');

  // 2. LINK & JOINT PARAMETERS
  rows.push('--- LINK CONFIGURATIONS & CURRENT ANGLES ---');
  rows.push('Joint_ID,Link_Name,Axis,Length_mm,Min_Angle_deg,Max_Angle_deg,Current_Angle_deg,Current_Angle_rad');
  links.forEach((link, idx) => {
    const rad = ((link.currentAngle * Math.PI) / 180).toFixed(4);
    rows.push(
      `${link.id},${link.name},${link.axis},${link.length},${link.minAngle},${link.maxAngle},${link.currentAngle},${rad}`
    );
  });
  rows.push('');

  // 3. DENAVIT-HARTENBERG PARAMETERS TABLE
  rows.push('--- DENAVIT-HARTENBERG (DH) PARAMETERS ---');
  rows.push('Joint_i,Theta_deg,d_mm,a_mm,Alpha_deg');
  result.dhTable.forEach((dh) => {
    rows.push(`${dh.joint},${dh.theta},${dh.d},${dh.a},${dh.alpha}`);
  });
  rows.push('');

  // 4. INTERMEDIATE JOINT COORDINATES
  rows.push('--- 3D JOINT POSITIONS ---');
  rows.push('Joint_ID,Joint_Name,X_mm,Y_mm,Z_mm');
  result.joints.forEach((j) => {
    rows.push(`${j.id},${j.name},${j.x},${j.y},${j.z}`);
  });
  rows.push('');

  // 5. HOMOGENEOUS TRANSFORMATION MATRIX T0_5
  rows.push('--- HOMOGENEOUS TRANSFORMATION MATRIX (T0_5) ---');
  rows.push('Row,C0,C1,C2,C3 (Translation mm)');
  result.transformationMatrix.forEach((row, idx) => {
    rows.push(`R${idx},${row.map((val) => Number(val.toFixed(4))).join(',')}`);
  });
  rows.push('');

  // 6. RECORDED WAYPOINTS (IF ANY)
  if (waypoints.length > 0) {
    rows.push('--- RECORDED WAYPOINTS TRAJECTORY ---');
    rows.push('Waypoint_ID,Name,Timestamp,Angle1_deg,Angle2_deg,Angle3_deg,Angle4_deg,Angle5_deg,TCP_X_mm,TCP_Y_mm,TCP_Z_mm');
    waypoints.forEach((wp) => {
      rows.push(
        `${wp.id},${wp.name},${wp.timestamp},${wp.angles[0]},${wp.angles[1]},${wp.angles[2]},${wp.angles[3]},${wp.angles[4]},${wp.tcp.x},${wp.tcp.y},${wp.tcp.z}`
      );
    });
    rows.push('');
  }

  const csvContent = rows.join('\n');
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadFile(csvContent, `robot_5dof_kinematics_${dateStr}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Generates and downloads a JSON export file of the 5-DOF robot arm state
 */
export function exportKinematicsToJSON(
  links: LinkConfig[],
  result: KinematicsResult,
  waypoints: Waypoint[] = []
) {
  const exportPayload = {
    metadata: {
      appName: '5-DOF Robotic Arm Kinematics & 3D Visualizer',
      exportTimestamp: new Date().toISOString(),
      dof: 5,
      coordinateSystem: {
        x: 'Right (Lateral)',
        y: 'Up (Height)',
        z: 'Depth (Front)',
      },
      units: {
        length: 'millimeters (mm)',
        angles: 'degrees (deg)',
        quaternion: 'normalized scalar-first (w, x, y, z)',
      },
    },
    endEffector: {
      position: {
        x: result.tcp.x,
        y: result.tcp.y,
        z: result.tcp.z,
        unit: 'mm',
      },
      euclideanReach: {
        current: result.tcp.reach,
        maxTheoretical: result.maxReach,
        unit: 'mm',
      },
      orientation: {
        roll: result.tcp.roll,
        pitch: result.tcp.pitch,
        yaw: result.tcp.yaw,
        unit: 'degrees',
      },
      quaternion: result.tcp.quaternion,
    },
    links: links.map((link) => ({
      id: link.id,
      name: link.name,
      codeName: link.codeName,
      axis: link.axis,
      lengthMm: link.length,
      angleRange: {
        minDeg: link.minAngle,
        maxDeg: link.maxAngle,
      },
      currentAngle: {
        degrees: link.currentAngle,
        radians: Number(((link.currentAngle * Math.PI) / 180).toFixed(5)),
      },
    })),
    denavitHartenbergParameters: result.dhTable,
    jointPositions: result.joints.map((j) => ({
      id: j.id,
      name: j.name,
      x: j.x,
      y: j.y,
      z: j.z,
      unit: 'mm',
    })),
    transformationMatrix: result.transformationMatrix.map((row) =>
      row.map((val) => Number(val.toFixed(5)))
    ),
    waypoints: waypoints,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadFile(jsonString, `robot_5dof_kinematics_${dateStr}.json`, 'application/json;charset=utf-8;');
}
