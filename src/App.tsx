/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileCode,
  Sliders,
  Compass,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  HelpCircle,
  RotateCcw,
  Bot,
  Layers,
  Sparkles,
} from 'lucide-react';
import { RobotCanvas } from './components/RobotCanvas';
import { JointControls, ARM_PRESETS } from './components/JointControls';
import { KinematicsPanel } from './components/KinematicsPanel';
import { ExportModal } from './components/ExportModal';
import { LinkConfig, RobotArmPreset, Waypoint } from './types/robot';
import { calculateForwardKinematics } from './utils/kinematics';
import { exportKinematicsToCSV, exportKinematicsToJSON } from './utils/export';

const INITIAL_LINKS: LinkConfig[] = [
  {
    id: 1,
    name: 'Sendi 1: Base (Pinggang)',
    codeName: 'J1_Waist',
    length: 150,
    minAngle: -180,
    maxAngle: 180,
    currentAngle: 0,
    axis: 'yaw',
    description: 'Rotasi horizontal 360° pada alas robot (Sumbu Y)',
    color: '#38bdf8',
  },
  {
    id: 2,
    name: 'Sendi 2: Bahu (Shoulder)',
    codeName: 'J2_Shoulder',
    length: 250,
    minAngle: -90,
    maxAngle: 90,
    currentAngle: 30,
    axis: 'pitch',
    description: 'Elevasi vertikal lengan utama atas (Sumbu Z)',
    color: '#0284c7',
  },
  {
    id: 3,
    name: 'Sendi 3: Siku (Elbow)',
    codeName: 'J3_Elbow',
    length: 200,
    minAngle: -150,
    maxAngle: 150,
    currentAngle: -45,
    axis: 'pitch',
    description: 'Fleksi lengan bawah (Sumbu Z paralel)',
    color: '#0ea5e9',
  },
  {
    id: 4,
    name: 'Sendi 4: Pergelangan Pitch',
    codeName: 'J4_WristPitch',
    length: 120,
    minAngle: -120,
    maxAngle: 120,
    currentAngle: 15,
    axis: 'pitch',
    description: 'Pengaturan kemiringan vertikal kepala alat (Sumbu Z)',
    color: '#06b6d4',
  },
  {
    id: 5,
    name: 'Sendi 5: Pergelangan Roll',
    codeName: 'J5_WristRoll',
    length: 80,
    minAngle: -180,
    maxAngle: 180,
    currentAngle: 0,
    axis: 'roll',
    description: 'Rotasi aksial alat / gripper ujung (Sumbu Longitudinal)',
    color: '#14b8a6',
  },
];

export default function App() {
  const [links, setLinks] = useState<LinkConfig[]>(INITIAL_LINKS);
  const [activeSidePanel, setActiveSidePanel] = useState<'controls' | 'kinematics' | 'none'>('controls');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [angleUnit, setAngleUnit] = useState<'deg' | 'rad'>('deg');

  // Visualization toggles
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTrail, setShowTrail] = useState<boolean>(true);
  const [showEnvelope, setShowEnvelope] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'side' | 'tcp'>('iso');

  // Trajectory waypoints
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    {
      id: 'wp-1',
      name: 'Posisi Standby (Home)',
      timestamp: new Date().toLocaleTimeString(),
      angles: [0, 0, 0, 0, 0],
      tcp: { x: 0, y: 800, z: 0 },
    },
    {
      id: 'wp-2',
      name: 'Posisi Ambil (Pick)',
      timestamp: new Date().toLocaleTimeString(),
      angles: [30, 45, -60, 15, 0],
      tcp: { x: 215, y: 380, z: 124 },
    },
    {
      id: 'wp-3',
      name: 'Posisi Letak (Place)',
      timestamp: new Date().toLocaleTimeString(),
      angles: [-45, 50, -40, -10, 45],
      tcp: { x: -280, y: 410, z: 280 },
    },
  ]);

  const [isPlayingTrajectory, setIsPlayingTrajectory] = useState<boolean>(false);
  const trajectoryTimerRef = useRef<number | null>(null);

  // Compute forward kinematics whenever links change
  const kinematics = useMemo(() => calculateForwardKinematics(links), [links]);

  // Update a single link's current angle
  const handleUpdateLinkAngle = (index: number, angle: number) => {
    setLinks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], currentAngle: angle };
      return updated;
    });
  };

  // Update link physical length
  const handleUpdateLinkLength = (index: number, length: number) => {
    setLinks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], length };
      return updated;
    });
  };

  // Update angle range bounds (min & max)
  const handleUpdateAngleRange = (index: number, min: number, max: number) => {
    setLinks((prev) => {
      const updated = [...prev];
      const clampedCurrent = Math.max(min, Math.min(max, updated[index].currentAngle));
      updated[index] = {
        ...updated[index],
        minAngle: min,
        maxAngle: max,
        currentAngle: clampedCurrent,
      };
      return updated;
    });
  };

  // Reset all joint angles to 0
  const handleResetAngles = () => {
    setLinks((prev) =>
      prev.map((link) => ({
        ...link,
        currentAngle: 0,
      }))
    );
  };

  // Apply a preset pose
  const handleApplyPresetPose = (angles: [number, number, number, number, number]) => {
    setLinks((prev) =>
      prev.map((link, idx) => ({
        ...link,
        currentAngle: angles[idx],
      }))
    );
  };

  // Apply an entire robot scale preset
  const handleApplyRobotPreset = (preset: RobotArmPreset) => {
    setLinks((prev) =>
      prev.map((link, idx) => ({
        ...link,
        length: preset.lengths[idx],
        minAngle: preset.angleRanges[idx].min,
        maxAngle: preset.angleRanges[idx].max,
        currentAngle: Math.max(
          preset.angleRanges[idx].min,
          Math.min(preset.angleRanges[idx].max, link.currentAngle)
        ),
      }))
    );
  };

  // Add current pose as a waypoint
  const handleAddWaypoint = () => {
    const newWp: Waypoint = {
      id: `wp-${Date.now()}`,
      name: `Pose Titik #${waypoints.length + 1}`,
      timestamp: new Date().toLocaleTimeString(),
      angles: links.map((l) => l.currentAngle) as [number, number, number, number, number],
      tcp: {
        x: kinematics.tcp.x,
        y: kinematics.tcp.y,
        z: kinematics.tcp.z,
      },
    };
    setWaypoints((prev) => [...prev, newWp]);
  };

  // Delete a waypoint
  const handleDeleteWaypoint = (id: string) => {
    setWaypoints((prev) => prev.filter((w) => w.id !== id));
  };

  // Play trajectory sequentially
  const handlePlayTrajectory = () => {
    if (isPlayingTrajectory) {
      if (trajectoryTimerRef.current) {
        clearInterval(trajectoryTimerRef.current);
      }
      setIsPlayingTrajectory(false);
      return;
    }

    if (waypoints.length === 0) return;

    setIsPlayingTrajectory(true);
    let currentIdx = 0;

    // Apply first waypoint immediately
    handleApplyPresetPose(waypoints[0].angles);

    trajectoryTimerRef.current = window.setInterval(() => {
      currentIdx = (currentIdx + 1) % waypoints.length;
      handleApplyPresetPose(waypoints[currentIdx].angles);
    }, 1800);
  };

  useEffect(() => {
    return () => {
      if (trajectoryTimerRef.current) {
        clearInterval(trajectoryTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 1. TOP NAVIGATION / HEADER BAR */}
      <header className="z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/90 px-4 backdrop-blur-md">
        {/* Brand & App Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-cyan-400 text-white shadow-md shadow-sky-500/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white sm:text-base">
                Simulator Kinematika Robot 5-DOF
              </h1>
              <span className="hidden rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-400 sm:inline-block">
                3D Three.js
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Perhitungan &amp; visualisasi posisi koordinat ujung lengan (End-Effector / TCP)
            </p>
          </div>
        </div>

        {/* Live TCP Quick Stats Bar (Center) */}
        <div className="hidden lg:flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-1.5 font-mono text-xs shadow-inner">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-sky-400 font-sans">TCP:</span>
            <span className="text-red-400 font-semibold">X: {kinematics.tcp.x.toFixed(1)}</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400 font-semibold">Y: {kinematics.tcp.y.toFixed(1)}</span>
            <span className="text-slate-600">|</span>
            <span className="text-blue-400 font-semibold">Z: {kinematics.tcp.z.toFixed(1)} mm</span>
          </div>
          <span className="text-slate-700">•</span>
          <div className="text-slate-300">
            Reach: <span className="font-semibold text-cyan-300">{kinematics.tcp.reach.toFixed(1)} mm</span>
          </div>
        </div>

        {/* Actions & Export Buttons */}
        <div className="flex items-center gap-2">
          {/* Quick CSV Export */}
          <button
            onClick={() => exportKinematicsToCSV(links, kinematics, waypoints)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
            title="Unduh langsung file CSV"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          {/* Quick JSON Export */}
          <button
            onClick={() => exportKinematicsToJSON(links, kinematics, waypoints)}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
            title="Unduh langsung file JSON"
          >
            <FileCode className="h-3.5 w-3.5 text-amber-400" />
            <span>JSON</span>
          </button>

          {/* Full Export Dialog Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-sky-500/20 hover:bg-sky-400 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor</span>
          </button>

          {/* Help Button */}
          <button
            onClick={() => setIsHelpOpen(!isHelpOpen)}
            className="rounded-lg border border-slate-700 bg-slate-800/80 p-1.5 text-slate-300 hover:bg-slate-700 hover:text-white transition"
            title="Panduan & Informasi Kinematika"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (3D Canvas + Collapsible Side Panels) */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* 3D Scene Viewport */}
        <main className="relative flex-1 h-full w-full">
          <RobotCanvas
            links={links}
            kinematics={kinematics}
            showAxes={showAxes}
            showGrid={showGrid}
            showTrail={showTrail}
            showEnvelope={showEnvelope}
            activeCameraPreset={cameraPreset}
          />

          {/* Viewport Overlay Controls (Bottom Dock / Scene Toggles) */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex max-w-[94vw] items-center gap-2">
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-800/90 bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-md">
              {/* Axes Toggle */}
              <button
                onClick={() => setShowAxes(!showAxes)}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  showAxes
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan / Sembunyikan Sumbu Koordinat RGB"
              >
                <Layers className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sumbu XYZ</span>
              </button>

              {/* Grid Toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  showGrid
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan / Sembunyikan Kisi Lantai"
              >
                <span>Grid Lantai</span>
              </button>

              {/* Trail Toggle */}
              <button
                onClick={() => setShowTrail(!showTrail)}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  showTrail
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan / Sembunyikan Jejak Lintasan Ujung Lengan"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Jejak Lintasan</span>
              </button>

              {/* Envelope Toggle */}
              <button
                onClick={() => setShowEnvelope(!showEnvelope)}
                className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  showEnvelope
                    ? 'bg-slate-800 text-sky-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilkan Batas Jangkauan Maksimum (Workspace Envelope)"
              >
                <span className="hidden sm:inline">Batas Jangkauan</span>
                <span className="sm:hidden">Envelope</span>
              </button>
            </div>

            {/* Toggle Fullscreen / Zen View */}
            <button
              onClick={() =>
                setActiveSidePanel((prev) => (prev === 'none' ? 'controls' : 'none'))
              }
              className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-slate-200 shadow-2xl hover:bg-slate-800 hover:text-white transition backdrop-blur-md"
              title="Sembunyikan / Buka Panel Samping"
            >
              {activeSidePanel === 'none' ? (
                <>
                  <Maximize2 className="h-4 w-4 text-sky-400" />
                  <span className="hidden md:inline">Buka Kontrol</span>
                </>
              ) : (
                <>
                  <Minimize2 className="h-4 w-4" />
                  <span className="hidden md:inline">Tampilan Penuh (Zen)</span>
                </>
              )}
            </button>
          </div>
        </main>

        {/* Side Panel Toggle Tabs (Right edge buttons when collapsed) */}
        {activeSidePanel === 'none' && (
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
            <button
              onClick={() => setActiveSidePanel('controls')}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md hover:bg-slate-800"
            >
              <Sliders className="h-4 w-4 text-sky-400" />
              <span>Input &amp; Kontrol</span>
            </button>
            <button
              onClick={() => setActiveSidePanel('kinematics')}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-white shadow-2xl backdrop-blur-md hover:bg-slate-800"
            >
              <Compass className="h-4 w-4 text-emerald-400" />
              <span>Hasil Kinematika</span>
            </button>
          </div>
        )}

        {/* Collapsible Interactive Side Drawer / Panel */}
        {activeSidePanel !== 'none' && (
          <aside className="relative z-30 flex h-full w-full max-w-md shrink-0 flex-col border-l border-slate-800 bg-slate-900 shadow-2xl transition-all sm:w-96 md:w-[440px]">
            {/* Panel Selector Header */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-2">
              <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
                <button
                  onClick={() => setActiveSidePanel('controls')}
                  className={`flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition ${
                    activeSidePanel === 'controls'
                      ? 'bg-sky-500 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Kontrol Sendi &amp; Link</span>
                </button>
                <button
                  onClick={() => setActiveSidePanel('kinematics')}
                  className={`flex items-center justify-center gap-2 rounded-md py-1.5 text-xs font-semibold transition ${
                    activeSidePanel === 'kinematics'
                      ? 'bg-emerald-500 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Hasil Kinematika</span>
                </button>
              </div>

              <button
                onClick={() => setActiveSidePanel('none')}
                className="ml-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                title="Tutup Panel"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Contents */}
            <div className="flex-1 overflow-hidden">
              {activeSidePanel === 'controls' ? (
                <JointControls
                  links={links}
                  onUpdateLinkAngle={handleUpdateLinkAngle}
                  onUpdateLinkLength={handleUpdateLinkLength}
                  onUpdateAngleRange={handleUpdateAngleRange}
                  onResetAngles={handleResetAngles}
                  onApplyPresetPose={handleApplyPresetPose}
                  onApplyRobotPreset={handleApplyRobotPreset}
                  waypoints={waypoints}
                  onAddWaypoint={handleAddWaypoint}
                  onDeleteWaypoint={handleDeleteWaypoint}
                  onPlayTrajectory={handlePlayTrajectory}
                  isPlayingTrajectory={isPlayingTrajectory}
                  angleUnit={angleUnit}
                  onToggleAngleUnit={() =>
                    setAngleUnit((prev) => (prev === 'deg' ? 'rad' : 'deg'))
                  }
                />
              ) : (
                <KinematicsPanel kinematics={kinematics} links={links} />
              )}
            </div>
          </aside>
        )}
      </div>

      {/* 3. MODALS */}
      {/* Export CSV / JSON Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        links={links}
        kinematics={kinematics}
        waypoints={waypoints}
      />

      {/* Help & Theory Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative flex w-full max-w-xl flex-col rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-sky-400" />
                <h3 className="text-base font-bold text-white">Panduan Kinematika Robot 5-DOF</h3>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                Aplikasi ini menghitung <strong>Kinematika Maju (Forward Kinematics)</strong> untuk lengan robot 5 Derajat Kebebasan (5-DOF / Degrees of Freedom) dan memvisualisasikan posturnya secara interaktif dalam format 3D menggunakan Three.js.
              </p>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                <span className="font-semibold text-sky-300 block">Struktur Sendi 5-DOF:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li><strong>J1 (Waist / Pinggang)</strong>: Rotasi terhadap sumbu Y vertikal (Yaw).</li>
                  <li><strong>J2 (Shoulder / Bahu)</strong>: Elevasi lengan utama (Pitch).</li>
                  <li><strong>J3 (Elbow / Siku)</strong>: Fleksi lengan depan (Pitch).</li>
                  <li><strong>J4 (Wrist Pitch)</strong>: Kemiringan kepala pergelangan (Pitch).</li>
                  <li><strong>J5 (Wrist Roll)</strong>: Rotasi aksial alat / gripper ujung (Roll).</li>
                </ul>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2">
                <span className="font-semibold text-emerald-300 block">Fitur Utama:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  <li><strong>Input Rentang Sudut</strong>: Tentukan batas fisik minimum dan maksimum tiap sendi.</li>
                  <li><strong>Panjang Link Fleksibel</strong>: Ubah panjang L1 hingga L5 dalam satuan milimeter.</li>
                  <li><strong>Visualisasi 3D Interaktif</strong>: Putar orbit, zoom, pan, dan ganti perspektif kamera.</li>
                  <li><strong>Ekspor CSV &amp; JSON</strong>: Ekspor data posisi TCP, orientasi Euler, Quaternion, dan matriks transformasi untuk analisis MATLAB, Python, Excel, atau ROS.</li>
                  <li><strong>Perekam Lintasan (Waypoints)</strong>: Simpan titik pose dan putar animasi pergerakan secara kontinu.</li>
                </ul>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-right">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="rounded-lg bg-sky-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-400"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
