import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { KinematicsResult, LinkConfig } from '../types/robot';

interface RobotCanvasProps {
  links: LinkConfig[];
  kinematics: KinematicsResult;
  showAxes: boolean;
  showGrid: boolean;
  showTrail: boolean;
  showEnvelope: boolean;
  onClearTrail?: () => void;
  activeCameraPreset?: 'iso' | 'top' | 'front' | 'side' | 'tcp';
}

const SCALE = 0.01; // 1 mm = 0.01 3D units (e.g. 200 mm = 2.0 units)

export const RobotCanvas: React.FC<RobotCanvasProps> = ({
  links,
  kinematics,
  showAxes,
  showGrid,
  showTrail,
  showEnvelope,
  activeCameraPreset,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<LinkConfig[]>(links);
  linksRef.current = links;

  const [screenTcp, setScreenTcp] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    robotRoot: THREE.Group;
    jointGroups: {
      j1Turntable: THREE.Group;
      j2Shoulder: THREE.Group;
      j3Elbow: THREE.Group;
      j4WristPitch: THREE.Group;
      j5WristRoll: THREE.Group;
      tcpTip: THREE.Group;
    };
    linkMeshes: {
      baseCylinder: THREE.Mesh;
      link1Mesh: THREE.Group;
      link2Mesh: THREE.Group;
      link3Mesh: THREE.Group;
      link4Mesh: THREE.Group;
      link5Mesh: THREE.Group;
    };
    axesGroup: THREE.Group;
    gridHelper: THREE.GridHelper;
    envelopeMesh: THREE.Mesh;
    trailLine: THREE.Line;
    trailPoints: THREE.Vector3[];
    targetAngles: number[];
    currentAngles: number[];
    targetCameraPos: THREE.Vector3;
    targetCameraLookAt: THREE.Vector3;
    isTransitioningCamera: boolean;
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.018);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(10, 8, 12);

    // 3. Renderer
    const isHeadless =
      typeof navigator !== 'undefined' &&
      (navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isHeadless;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.05; // Don't go below floor
    controls.minDistance = 2;
    controls.maxDistance = 35;
    controls.target.set(0, 3.5, 0);
    controls.update();

    // 5. Studio Environment & Lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    keyLight.position.set(12, 18, 10);
    keyLight.castShadow = !isHeadless;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    const shadowD = 8;
    keyLight.shadow.camera.left = -shadowD;
    keyLight.shadow.camera.right = shadowD;
    keyLight.shadow.camera.top = shadowD;
    keyLight.shadow.camera.bottom = -shadowD;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    // Fill Light (Cool cyan sky, dark ground)
    const hemiLight = new THREE.HemisphereLight(0x7090b0, 0x181c24, 0.9);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Rim Light (back-blue highlight)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-10, 8, -12);
    scene.add(rimLight);

    // 6. Ground & Contact Shadow
    // Grid floor
    const gridHelper = new THREE.GridHelper(30, 60, 0x0284c7, 0x1e293b);
    gridHelper.position.y = 0.001;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.45;
    scene.add(gridHelper);

    // Radial floor ground plate with circular mm scale rings
    const floorPlateGeo = new THREE.CircleGeometry(14, 64);
    const floorPlateMat = new THREE.MeshStandardMaterial({
      color: 0x0c1322,
      roughness: 0.85,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const floorPlate = new THREE.Mesh(floorPlateGeo, floorPlateMat);
    floorPlate.rotation.x = -Math.PI / 2;
    floorPlate.receiveShadow = true;
    scene.add(floorPlate);

    // Concentric coordinate rings
    const ringGroup = new THREE.Group();
    [2, 4, 6, 8, 10, 12].forEach((radius) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.015, radius + 0.015, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.003;
      ringGroup.add(ring);
    });
    scene.add(ringGroup);

    // Soft contact shadow directly under robot base
    const shadowGeo = new THREE.PlaneGeometry(5, 5);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext('2d')!;
    const gradient = sctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    gradient.addColorStop(0, 'rgba(0,0,0,0.85)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0.4)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = gradient;
    sctx.fillRect(0, 0, 256, 256);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.005;
    scene.add(contactShadow);

    // 7. ROBOT PROCEDURAL ASSEMBLY (Hierarchical Three.js Groups)
    // Materials
    const baseMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.25,
    });
    const bodyOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xe06010, // Kuka/Industrial Robot Orange
      metalness: 0.35,
      roughness: 0.3,
    });
    const jointSilverMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.18,
    });
    const accentCyanMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      metalness: 0.4,
      roughness: 0.3,
      emissive: 0x0891b2,
      emissiveIntensity: 0.25,
    });
    const darkHousingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.7,
      roughness: 0.35,
    });

    const robotRoot = new THREE.Group();
    scene.add(robotRoot);

    // BASE PEDESTAL (Fixed to ground)
    const pedestalBase = new THREE.Group();
    robotRoot.add(pedestalBase);

    // Base flange ring
    const baseFlangeGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.2, 32);
    const baseFlange = new THREE.Mesh(baseFlangeGeo, baseMetalMat);
    baseFlange.position.y = 0.1;
    baseFlange.castShadow = true;
    baseFlange.receiveShadow = true;
    pedestalBase.add(baseFlange);

    // Base bolts pattern around perimeter
    const boltGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12);
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const bolt = new THREE.Mesh(boltGeo, jointSilverMat);
      bolt.position.set(1.5 * Math.cos(angle), 0.22, 1.5 * Math.sin(angle));
      pedestalBase.add(bolt);
    }

    // Pedestal tower column (Base Link 1 height dynamically updated)
    const baseCylinderGeo = new THREE.CylinderGeometry(1.2, 1.4, 1.5, 32);
    const baseCylinder = new THREE.Mesh(baseCylinderGeo, bodyOrangeMat);
    baseCylinder.position.y = 0.85;
    baseCylinder.castShadow = true;
    baseCylinder.receiveShadow = true;
    pedestalBase.add(baseCylinder);

    // Decorative ring on base
    const baseRingGeo = new THREE.TorusGeometry(1.3, 0.08, 16, 48);
    const baseRing = new THREE.Mesh(baseRingGeo, jointSilverMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = 0.8;
    pedestalBase.add(baseRing);

    // JOINT 1: Turntable (Rotates around Y - Yaw)
    const j1Turntable = new THREE.Group();
    j1Turntable.position.set(0, 1.5, 0); // initial default L1
    robotRoot.add(j1Turntable);

    // Turntable rotating disc
    const turntableDiscGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.3, 32);
    const turntableDisc = new THREE.Mesh(turntableDiscGeo, darkHousingMat);
    turntableDisc.position.y = 0.15;
    turntableDisc.castShadow = true;
    j1Turntable.add(turntableDisc);

    // Shoulder dual fork brackets
    const link1Mesh = new THREE.Group();
    j1Turntable.add(link1Mesh);

    const forkGeo = new THREE.BoxGeometry(0.4, 0.9, 0.9);
    const forkLeft = new THREE.Mesh(forkGeo, bodyOrangeMat);
    forkLeft.position.set(-0.6, 0.6, 0);
    forkLeft.castShadow = true;
    link1Mesh.add(forkLeft);

    const forkRight = new THREE.Mesh(forkGeo, bodyOrangeMat);
    forkRight.position.set(0.6, 0.6, 0);
    forkRight.castShadow = true;
    link1Mesh.add(forkRight);

    // Shoulder motor casing between forks
    const shoulderMotorGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.45, 32);
    const shoulderMotor = new THREE.Mesh(shoulderMotorGeo, jointSilverMat);
    shoulderMotor.rotation.z = Math.PI / 2;
    shoulderMotor.position.set(0, 0.7, 0);
    shoulderMotor.castShadow = true;
    link1Mesh.add(shoulderMotor);

    // JOINT 2: Shoulder Pitch (Rotates around Z)
    const j2Shoulder = new THREE.Group();
    j2Shoulder.position.set(0, 0.7, 0);
    j1Turntable.add(j2Shoulder);

    // LINK 2: Upper Arm
    const link2Mesh = new THREE.Group();
    j2Shoulder.add(link2Mesh);

    // Upper arm main body (procedural tapered beam)
    const upperArmBeamGeo = new THREE.BoxGeometry(0.7, 2.5, 0.65);
    const upperArmBeam = new THREE.Mesh(upperArmBeamGeo, bodyOrangeMat);
    upperArmBeam.position.set(0, 1.25, 0);
    upperArmBeam.castShadow = true;
    link2Mesh.add(upperArmBeam);

    // Side reinforcement strut / hydraulic rod
    const strutGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.0, 16);
    const strut = new THREE.Mesh(strutGeo, jointSilverMat);
    strut.position.set(0.45, 1.25, 0);
    strut.castShadow = true;
    link2Mesh.add(strut);

    // Accent strip
    const accentGeo = new THREE.BoxGeometry(0.1, 1.8, 0.67);
    const accentMesh = new THREE.Mesh(accentGeo, accentCyanMat);
    accentMesh.position.set(0, 1.25, 0);
    link2Mesh.add(accentMesh);

    // JOINT 3: Elbow Pitch (Rotates around Z)
    const j3Elbow = new THREE.Group();
    j3Elbow.position.set(0, 2.5, 0); // initial default L2
    j2Shoulder.add(j3Elbow);

    // Elbow rotary joint housing
    const elbowHousingGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.0, 32);
    const elbowHousing = new THREE.Mesh(elbowHousingGeo, darkHousingMat);
    elbowHousing.rotation.z = Math.PI / 2;
    elbowHousing.castShadow = true;
    j3Elbow.add(elbowHousing);

    // LINK 3: Forearm
    const link3Mesh = new THREE.Group();
    j3Elbow.add(link3Mesh);

    const forearmBeamGeo = new THREE.BoxGeometry(0.55, 2.0, 0.5);
    const forearmBeam = new THREE.Mesh(forearmBeamGeo, bodyOrangeMat);
    forearmBeam.position.set(0, 1.0, 0);
    forearmBeam.castShadow = true;
    link3Mesh.add(forearmBeam);

    // Forearm cable channel
    const channelGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 16);
    const channel = new THREE.Mesh(channelGeo, jointSilverMat);
    channel.position.set(-0.35, 1.0, 0);
    link3Mesh.add(channel);

    // JOINT 4: Wrist Pitch (Rotates around Z)
    const j4WristPitch = new THREE.Group();
    j4WristPitch.position.set(0, 2.0, 0); // initial default L3
    j3Elbow.add(j4WristPitch);

    // Wrist pitch yoke
    const wristPitchHousingGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.8, 24);
    const wristPitchHousing = new THREE.Mesh(wristPitchHousingGeo, darkHousingMat);
    wristPitchHousing.rotation.z = Math.PI / 2;
    wristPitchHousing.castShadow = true;
    j4WristPitch.add(wristPitchHousing);

    // LINK 4: Wrist Body
    const link4Mesh = new THREE.Group();
    j4WristPitch.add(link4Mesh);

    const wristBodyGeo = new THREE.CylinderGeometry(0.3, 0.35, 1.2, 24);
    const wristBody = new THREE.Mesh(wristBodyGeo, jointSilverMat);
    wristBody.position.set(0, 0.6, 0);
    wristBody.castShadow = true;
    link4Mesh.add(wristBody);

    // JOINT 5: Wrist Roll (Rotates around Y - Tool axis)
    const j5WristRoll = new THREE.Group();
    j5WristRoll.position.set(0, 1.2, 0); // initial default L4
    j4WristPitch.add(j5WristRoll);

    // LINK 5 & END EFFECTOR (Tool/Gripper)
    const link5Mesh = new THREE.Group();
    j5WristRoll.add(link5Mesh);

    // Tool mount flange plate
    const toolFlangeGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.15, 32);
    const toolFlange = new THREE.Mesh(toolFlangeGeo, accentCyanMat);
    toolFlange.position.set(0, 0.075, 0);
    toolFlange.castShadow = true;
    link5Mesh.add(toolFlange);

    // Gripper base hub
    const gripperHubGeo = new THREE.BoxGeometry(0.4, 0.3, 0.5);
    const gripperHub = new THREE.Mesh(gripperHubGeo, darkHousingMat);
    gripperHub.position.set(0, 0.28, 0);
    gripperHub.castShadow = true;
    link5Mesh.add(gripperHub);

    // Left Gripper Finger Jaw
    const fingerGeo = new THREE.BoxGeometry(0.08, 0.5, 0.15);
    const fingerLeft = new THREE.Mesh(fingerGeo, jointSilverMat);
    fingerLeft.position.set(0, 0.6, -0.15);
    fingerLeft.castShadow = true;
    link5Mesh.add(fingerLeft);

    // Right Gripper Finger Jaw
    const fingerRight = new THREE.Mesh(fingerGeo, jointSilverMat);
    fingerRight.position.set(0, 0.6, 0.15);
    fingerRight.castShadow = true;
    link5Mesh.add(fingerRight);

    // Rubber pads on gripper jaws
    const padGeo = new THREE.BoxGeometry(0.09, 0.35, 0.04);
    const padLeft = new THREE.Mesh(padGeo, accentCyanMat);
    padLeft.position.set(0, 0.6, -0.11);
    link5Mesh.add(padLeft);

    const padRight = new THREE.Mesh(padGeo, accentCyanMat);
    padRight.position.set(0, 0.6, 0.11);
    link5Mesh.add(padRight);

    // TCP TIP (Point marker at tip of fingers)
    const tcpTip = new THREE.Group();
    tcpTip.position.set(0, 0.8, 0); // initial default L5
    j5WristRoll.add(tcpTip);

    // Glowing TCP sphere indicator
    const tcpSphereGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const tcpSphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: false,
    });
    const tcpSphere = new THREE.Mesh(tcpSphereGeo, tcpSphereMat);
    tcpTip.add(tcpSphere);

    // TCP Outer Pulsing Ring
    const tcpRingGeo = new THREE.RingGeometry(0.12, 0.16, 24);
    const tcpRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const tcpRing = new THREE.Mesh(tcpRingGeo, tcpRingMat);
    tcpRing.rotation.x = Math.PI / 2;
    tcpTip.add(tcpRing);

    // 8. AXES TRIPODS (Red=X, Green=Y, Blue=Z)
    const axesGroup = new THREE.Group();
    scene.add(axesGroup);

    // Base origin axes
    const baseAxes = new THREE.AxesHelper(1.8);
    (baseAxes.material as THREE.Material).depthTest = false;
    baseAxes.renderOrder = 2;
    axesGroup.add(baseAxes);

    // TCP Tool Center Point Axes
    const tcpAxes = new THREE.AxesHelper(1.2);
    (tcpAxes.material as THREE.Material).depthTest = false;
    tcpAxes.renderOrder = 3;
    tcpTip.add(tcpAxes);

    // 9. WORKSPACE REACH ENVELOPE (Sphere wireframe)
    const envelopeGeo = new THREE.SphereGeometry(8, 24, 18, 0, Math.PI * 2, 0, Math.PI / 2);
    const envelopeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const envelopeMesh = new THREE.Mesh(envelopeGeo, envelopeMat);
    envelopeMesh.position.set(0, 0, 0);
    scene.add(envelopeMesh);

    // 10. TRAIL / TRAJECTORY RIBBON
    const MAX_TRAIL_POINTS = 300;
    const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);

    // Store references
    threeRef.current = {
      scene,
      camera,
      renderer,
      controls,
      robotRoot,
      jointGroups: {
        j1Turntable,
        j2Shoulder,
        j3Elbow,
        j4WristPitch,
        j5WristRoll,
        tcpTip,
      },
      linkMeshes: {
        baseCylinder,
        link1Mesh,
        link2Mesh,
        link3Mesh,
        link4Mesh,
        link5Mesh,
      },
      axesGroup,
      gridHelper,
      envelopeMesh,
      trailLine,
      trailPoints: [],
      targetAngles: links.map((l) => l.currentAngle),
      currentAngles: links.map((l) => l.currentAngle),
      targetCameraPos: camera.position.clone(),
      targetCameraLookAt: controls.target.clone(),
      isTransitioningCamera: false,
    };

    // Pre-allocate vector for render loop to avoid GC
    const _worldPos = new THREE.Vector3();
    let animationFrameId: number;
    let lastTime = performance.now();

    // RENDER LOOP
    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const state = threeRef.current;
      if (!state) return;

      const currentLinks = linksRef.current;

      // Smooth joint angle interpolation (MathUtils.damp)
      let isMoving = false;
      for (let i = 0; i < 5; i++) {
        const target = currentLinks[i].currentAngle;
        const current = state.currentAngles[i];
        if (Math.abs(target - current) > 0.01) {
          state.currentAngles[i] = THREE.MathUtils.damp(current, target, 12, delta);
          isMoving = true;
        } else {
          state.currentAngles[i] = target;
        }
      }

      // Update link length geometries and group positions
      const l1 = currentLinks[0].length * SCALE;
      const l2 = currentLinks[1].length * SCALE;
      const l3 = currentLinks[2].length * SCALE;
      const l4 = currentLinks[3].length * SCALE;
      const l5 = currentLinks[4].length * SCALE;

      // Base column scale
      state.linkMeshes.baseCylinder.scale.set(1, Math.max(0.2, (l1 - 0.7) / 0.8), 1);
      state.linkMeshes.baseCylinder.position.y = (l1 - 0.7) / 2 + 0.1;

      // Joint 1 position (Waist height)
      state.jointGroups.j1Turntable.position.set(0, l1, 0);
      state.jointGroups.j1Turntable.rotation.y = (state.currentAngles[0] * Math.PI) / 180;

      // Joint 2 (Shoulder pitch around Z)
      state.jointGroups.j2Shoulder.rotation.z = (state.currentAngles[1] * Math.PI) / 180;

      // Link 2 scale & offset to elbow
      state.jointGroups.j3Elbow.position.set(0, l2, 0);
      state.jointGroups.j3Elbow.rotation.z = (state.currentAngles[2] * Math.PI) / 180;
      state.linkMeshes.link2Mesh.scale.set(1, l2 / 2.5, 1);

      // Link 3 scale & offset to wrist pitch
      state.jointGroups.j4WristPitch.position.set(0, l3, 0);
      state.jointGroups.j4WristPitch.rotation.z = (state.currentAngles[3] * Math.PI) / 180;
      state.linkMeshes.link3Mesh.scale.set(1, l3 / 2.0, 1);

      // Link 4 scale & offset to wrist roll
      state.jointGroups.j5WristRoll.position.set(0, l4, 0);
      state.jointGroups.j5WristRoll.rotation.y = (state.currentAngles[4] * Math.PI) / 180; // Roll around tool longitudinal axis
      state.linkMeshes.link4Mesh.scale.set(1, l4 / 1.2, 1);

      // Link 5 tool length to TCP
      state.jointGroups.tcpTip.position.set(0, l5, 0);
      state.linkMeshes.link5Mesh.scale.set(1, l5 / 0.8, 1);

      // Smooth camera transition if active
      if (state.isTransitioningCamera) {
        state.camera.position.lerp(state.targetCameraPos, 0.08);
        state.controls.target.lerp(state.targetCameraLookAt, 0.08);
        if (state.camera.position.distanceTo(state.targetCameraPos) < 0.05) {
          state.isTransitioningCamera = false;
        }
      }

      // Update Controls
      state.controls.update();

      // Record trajectory trail points
      state.jointGroups.tcpTip.getWorldPosition(_worldPos);
      if (isMoving && state.trailLine.visible) {
        if (
          state.trailPoints.length === 0 ||
          _worldPos.distanceTo(state.trailPoints[state.trailPoints.length - 1]) > 0.05
        ) {
          state.trailPoints.push(_worldPos.clone());
          if (state.trailPoints.length > MAX_TRAIL_POINTS) {
            state.trailPoints.shift();
          }

          const posAttr = state.trailLine.geometry.attributes.position as THREE.BufferAttribute;
          for (let p = 0; p < state.trailPoints.length; p++) {
            posAttr.setXYZ(p, state.trailPoints[p].x, state.trailPoints[p].y, state.trailPoints[p].z);
          }
          state.trailLine.geometry.setDrawRange(0, state.trailPoints.length);
          posAttr.needsUpdate = true;
        }
      }

      // Project TCP coordinates to 2D screen space for interactive floating badge
      const screenCoord = _worldPos.clone().project(state.camera);
      const isBehind = screenCoord.z > 1;
      const screenX = ((screenCoord.x + 1) * width) / 2;
      const screenY = ((-screenCoord.y + 1) * height) / 2;

      setScreenTcp({
        x: screenX,
        y: screenY,
        visible: !isBehind && screenX > 20 && screenX < width - 20 && screenY > 20 && screenY < height - 20,
      });

      // Render
      state.renderer.render(state.scene, state.camera);
    };

    // Pre-warm renderer
    renderer.compile(scene, camera);
    animationFrameId = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!container || !threeRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      threeRef.current.camera.aspect = w / h;
      threeRef.current.camera.updateProjectionMatrix();
      threeRef.current.renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync visibility props
  useEffect(() => {
    if (!threeRef.current) return;
    threeRef.current.axesGroup.visible = showAxes;
    threeRef.current.gridHelper.visible = showGrid;
    threeRef.current.trailLine.visible = showTrail;
    threeRef.current.envelopeMesh.visible = showEnvelope;

    // Update envelope radius based on maxReach
    const maxReach3D = kinematics.maxReach * SCALE;
    threeRef.current.envelopeMesh.scale.set(maxReach3D / 8, maxReach3D / 8, maxReach3D / 8);
  }, [showAxes, showGrid, showTrail, showEnvelope, kinematics.maxReach]);

  // Handle camera presets
  const applyCameraPreset = useCallback((preset: 'iso' | 'top' | 'front' | 'side' | 'tcp') => {
    const state = threeRef.current;
    if (!state) return;

    state.isTransitioningCamera = true;
    switch (preset) {
      case 'iso':
        state.targetCameraPos.set(10, 8, 12);
        state.targetCameraLookAt.set(0, 3.5, 0);
        break;
      case 'top':
        state.targetCameraPos.set(0.001, 16, 0);
        state.targetCameraLookAt.set(0, 0, 0);
        break;
      case 'front':
        state.targetCameraPos.set(0, 4, 15);
        state.targetCameraLookAt.set(0, 4, 0);
        break;
      case 'side':
        state.targetCameraPos.set(15, 4, 0);
        state.targetCameraLookAt.set(0, 4, 0);
        break;
      case 'tcp': {
        const tcpWorld = new THREE.Vector3();
        state.jointGroups.tcpTip.getWorldPosition(tcpWorld);
        state.targetCameraLookAt.copy(tcpWorld);
        state.targetCameraPos.set(tcpWorld.x + 3, tcpWorld.y + 2, tcpWorld.z + 4);
        break;
      }
    }
  }, []);

  useEffect(() => {
    if (activeCameraPreset) {
      applyCameraPreset(activeCameraPreset);
    }
  }, [activeCameraPreset, applyCameraPreset]);

  // Clear trail method
  const handleClearTrail = () => {
    if (!threeRef.current) return;
    threeRef.current.trailPoints = [];
    threeRef.current.trailLine.geometry.setDrawRange(0, 0);
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating 3D TCP Projected Label */}
      {screenTcp.visible && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full transform pb-3 transition-opacity duration-150"
          style={{ left: `${screenTcp.x}px`, top: `${screenTcp.y}px` }}
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-sky-400/50 bg-slate-900/90 px-2.5 py-1 text-xs font-mono shadow-xl shadow-cyan-950/50 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-cyan-400/30" />
            <span className="font-semibold text-sky-200">TCP:</span>
            <span className="text-slate-100 font-bold">
              ({kinematics.tcp.x.toFixed(1)}, {kinematics.tcp.y.toFixed(1)}, {kinematics.tcp.z.toFixed(1)}) mm
            </span>
          </div>
          {/* Subtle pointer tick */}
          <div className="mx-auto h-2 w-0.5 bg-sky-400/80 shadow" />
        </div>
      )}

      {/* Camera and Viewport Toolbar (Top-Right) */}
      <div className="absolute top-4 right-4 z-20 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-xl backdrop-blur-md">
        <span className="px-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Kamera:
        </span>
        <button
          onClick={() => applyCameraPreset('iso')}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          title="Tampilan Isometrik 3D"
        >
          3D Iso
        </button>
        <button
          onClick={() => applyCameraPreset('top')}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          title="Tampilan Atas (Sumbu X-Z)"
        >
          Atas (Top)
        </button>
        <button
          onClick={() => applyCameraPreset('front')}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          title="Tampilan Depan (Sumbu X-Y)"
        >
          Depan
        </button>
        <button
          onClick={() => applyCameraPreset('side')}
          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
          title="Tampilan Samping (Sumbu Y-Z)"
        >
          Samping
        </button>
        <button
          onClick={() => applyCameraPreset('tcp')}
          className="rounded-lg bg-sky-500/20 px-2.5 py-1 text-xs font-medium text-sky-300 hover:bg-sky-500/30 transition-colors"
          title="Fokuskan Kamera Langsung ke Ujung Lengan (TCP)"
        >
          Fokus TCP
        </button>
        {showTrail && (
          <button
            onClick={handleClearTrail}
            className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 transition-colors"
            title="Bersihkan jejak lintasan ujung lengan"
          >
            Hapus Jejak
          </button>
        )}
      </div>

      {/* Axis Guide Legend (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 rounded-lg border border-slate-800/80 bg-slate-900/85 px-3 py-1.5 text-[11px] font-mono text-slate-300 shadow-lg backdrop-blur-sm">
        <span className="text-slate-400 font-sans font-medium">Sumbu:</span>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-500" />
          <span>+X (Kanan)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-green-500" />
          <span>+Y (Tinggi)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          <span>+Z (Depan)</span>
        </div>
      </div>
    </div>
  );
};
