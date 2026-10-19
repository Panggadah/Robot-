import React, { useState } from 'react';
import {
  RotateCcw,
  Sliders,
  Ruler,
  Play,
  Square,
  BookmarkPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { AnglePreset, LinkConfig, RobotArmPreset, Waypoint } from '../types/robot';

interface JointControlsProps {
  links: LinkConfig[];
  onUpdateLinkAngle: (index: number, angle: number) => void;
  onUpdateLinkLength: (index: number, length: number) => void;
  onUpdateAngleRange: (index: number, min: number, max: number) => void;
  onResetAngles: () => void;
  onApplyPresetPose: (angles: [number, number, number, number, number]) => void;
  onApplyRobotPreset: (preset: RobotArmPreset) => void;
  waypoints: Waypoint[];
  onAddWaypoint: () => void;
  onDeleteWaypoint: (id: string) => void;
  onPlayTrajectory: () => void;
  isPlayingTrajectory: boolean;
  angleUnit: 'deg' | 'rad';
  onToggleAngleUnit: () => void;
}

export const ARM_PRESETS: RobotArmPreset[] = [
  {
    name: 'Industrial Standard (680mm)',
    description: 'Konfigurasi lengan robot standar manufaktur & perakitan',
    lengths: [150, 250, 200, 120, 80],
    angleRanges: [
      { min: -180, max: 180 },
      { min: -90, max: 90 },
      { min: -150, max: 150 },
      { min: -120, max: 120 },
      { min: -180, max: 180 },
    ],
  },
  {
    name: 'Desktop Edukasi (370mm)',
    description: 'Ukuran kompak mini-arm servo untuk laboratorium sekolah / riset',
    lengths: [80, 140, 110, 60, 40],
    angleRanges: [
      { min: -135, max: 135 },
      { min: -80, max: 80 },
      { min: -120, max: 120 },
      { min: -90, max: 90 },
      { min: -180, max: 180 },
    ],
  },
  {
    name: 'Long Reach Articulated (900mm)',
    description: 'Lengan jangkauan jauh untuk inspeksi dan pengelasan kontur luas',
    lengths: [200, 320, 260, 150, 100],
    angleRanges: [
      { min: -180, max: 180 },
      { min: -100, max: 100 },
      { min: -160, max: 160 },
      { min: -130, max: 130 },
      { min: -180, max: 180 },
    ],
  },
];

export const POSE_PRESETS: AnglePreset[] = [
  {
    name: 'Home / Vertikal',
    iconName: 'Home',
    angles: [0, 0, 0, 0, 0],
  },
  {
    name: 'Siap Kerja (Ready)',
    iconName: 'Ready',
    angles: [0, 35, -45, 10, 0],
  },
  {
    name: 'Jangkauan Depan (Reach)',
    iconName: 'Reach',
    angles: [0, 65, -30, -35, 0],
  },
  {
    name: 'Ambil Barang / Meja (Pick)',
    iconName: 'Pick',
    angles: [45, 60, -75, 15, 90],
  },
  {
    name: 'Inspeksi Sudut (Inspect)',
    iconName: 'Inspect',
    angles: [-60, 25, 45, -70, 45],
  },
];

export const JointControls: React.FC<JointControlsProps> = ({
  links,
  onUpdateLinkAngle,
  onUpdateLinkLength,
  onUpdateAngleRange,
  onResetAngles,
  onApplyPresetPose,
  onApplyRobotPreset,
  waypoints,
  onAddWaypoint,
  onDeleteWaypoint,
  onPlayTrajectory,
  isPlayingTrajectory,
  angleUnit,
  onToggleAngleUnit,
}) => {
  const [activeTab, setActiveTab] = useState<'joints' | 'lengths' | 'ranges' | 'trajectory'>('joints');
  const [expandedJointRange, setExpandedJointRange] = useState<number | null>(null);

  // Helper to format angle based on current unit
  const formatAngle = (deg: number) => {
    if (angleUnit === 'rad') {
      return `${((deg * Math.PI) / 180).toFixed(3)} rad`;
    }
    return `${deg.toFixed(1)}°`;
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl">
      {/* Header Panel Tabs */}
      <div className="border-b border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sliders className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white">Parameter Robot 5-DOF</h2>
              <p className="text-[11px] text-slate-400">Kontrol Sudut &amp; Dimensi Link</p>
            </div>
          </div>

          {/* Unit Toggle and Reset */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleAngleUnit}
              className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] font-mono font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Ganti Satuan Sudut (Derajat / Radian)"
            >
              {angleUnit === 'deg' ? 'Unit: Deg (°)' : 'Unit: Rad (rad)'}
            </button>
            <button
              onClick={onResetAngles}
              className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Reset Semua Sudut ke 0°"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('joints')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${
              activeTab === 'joints'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Sudut Sendi</span>
          </button>
          <button
            onClick={() => setActiveTab('lengths')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${
              activeTab === 'lengths'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ruler className="h-3.5 w-3.5" />
            <span>Panjang Link</span>
          </button>
          <button
            onClick={() => setActiveTab('ranges')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${
              activeTab === 'ranges'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Rentang Batas</span>
          </button>
          <button
            onClick={() => setActiveTab('trajectory')}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${
              activeTab === 'trajectory'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Lintasan ({waypoints.length})</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SUDUT SENDI (JOINT ANGLES) */}
        {activeTab === 'joints' && (
          <div className="space-y-4">
            {/* Quick Pose Presets Bar */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Preset Pose Cepat:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {POSE_PRESETS.map((pose) => (
                  <button
                    key={pose.name}
                    onClick={() => onApplyPresetPose(pose.angles)}
                    className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-800/60 px-2 py-1.5 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:bg-slate-800 hover:text-sky-300 transition"
                  >
                    {pose.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Joint Sliders & Controls */}
            <div className="space-y-3.5">
              {links.map((link, idx) => {
                const currentVal = link.currentAngle;
                const min = link.minAngle;
                const max = link.maxAngle;

                return (
                  <div
                    key={link.id}
                    className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 transition-all hover:border-slate-700"
                  >
                    {/* Header info */}
                    <div className="flex items-center justify-between gap-2 pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-xs font-bold font-mono text-sky-400">
                          J{link.id}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-slate-100">{link.name}</span>
                            <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] font-mono text-slate-400 uppercase">
                              {link.axis}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{link.description}</p>
                        </div>
                      </div>

                      {/* Numeric Direct Input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={min}
                          max={max}
                          step={1}
                          value={Math.round(currentVal * 10) / 10}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              onUpdateLinkAngle(idx, Math.max(min, Math.min(max, val)));
                            }
                          }}
                          className="w-16 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-1 text-right text-xs font-mono font-semibold text-sky-300 focus:border-sky-500 focus:outline-none"
                        />
                        <span className="text-xs font-mono text-slate-400">
                          {angleUnit === 'deg' ? '°' : 'rad'}
                        </span>
                      </div>
                    </div>

                    {/* Range Slider */}
                    <div className="mt-2 space-y-1">
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={0.5}
                        value={currentVal}
                        onChange={(e) => onUpdateLinkAngle(idx, parseFloat(e.target.value))}
                        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-500 hover:accent-sky-400"
                      />

                      {/* Slider min / max labels & quick nudge buttons */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                        <span>{min}°</span>

                        {/* Nudge buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onUpdateLinkAngle(idx, Math.max(min, currentVal - 5))}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                            title="-5 Derajat"
                          >
                            -5°
                          </button>
                          <button
                            onClick={() => onUpdateLinkAngle(idx, Math.max(min, currentVal - 1))}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                            title="-1 Derajat"
                          >
                            -1°
                          </button>
                          <button
                            onClick={() => onUpdateLinkAngle(idx, 0)}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                            title="Reset ke 0"
                          >
                            0°
                          </button>
                          <button
                            onClick={() => onUpdateLinkAngle(idx, Math.min(max, currentVal + 1))}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                            title="+1 Derajat"
                          >
                            +1°
                          </button>
                          <button
                            onClick={() => onUpdateLinkAngle(idx, Math.min(max, currentVal + 5))}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700"
                            title="+5 Derajat"
                          >
                            +5°
                          </button>
                        </div>

                        <span>{max}°</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PANJANG PER LINK (LINK LENGTHS) */}
        {activeTab === 'lengths' && (
          <div className="space-y-4">
            {/* Robot Model Preset Selector */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Pilih Model / Skala Robot:
              </span>
              <div className="space-y-1.5">
                {ARM_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => onApplyRobotPreset(preset)}
                    className="w-full text-left rounded-lg border border-slate-800/90 bg-slate-800/40 p-2.5 hover:border-sky-500/60 hover:bg-slate-800/80 transition"
                  >
                    <div className="text-xs font-semibold text-slate-200">{preset.name}</div>
                    <div className="text-[11px] text-slate-400">{preset.description}</div>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-sky-400">
                      <span>L1={preset.lengths[0]}</span>
                      <span>L2={preset.lengths[1]}</span>
                      <span>L3={preset.lengths[2]}</span>
                      <span>L4={preset.lengths[3]}</span>
                      <span>L5={preset.lengths[4]} mm</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Link Length Inputs */}
            <div className="space-y-3">
              <span className="text-xs font-semibold text-slate-300">
                Kustomisasi Panjang Per Link (mm):
              </span>

              {links.map((link, idx) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 p-3"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-800 font-mono text-xs font-bold text-sky-400">
                      L{link.id}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-100">{link.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {idx === 0
                          ? 'Tinggi dasar ke bahu'
                          : idx === 1
                          ? 'Lengan atas (Upper Arm)'
                          : idx === 2
                          ? 'Lengan bawah (Forearm)'
                          : idx === 3
                          ? 'Pergelangan (Wrist Pitch)'
                          : 'Ujung alat / Gripper ke TCP'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={10}
                      max={1200}
                      step={5}
                      value={link.length}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          onUpdateLinkLength(idx, val);
                        }
                      }}
                      className="w-20 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-right text-xs font-mono font-semibold text-sky-300 focus:border-sky-500 focus:outline-none"
                    />
                    <span className="text-xs font-mono text-slate-400">mm</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RENTANG BATAS SUDUT (ANGLE RANGES) */}
        {activeTab === 'ranges' && (
          <div className="space-y-3">
            <div className="rounded-xl border border-sky-900/30 bg-sky-950/20 p-3 text-xs text-sky-200">
              Atur batas minimum dan maksimum gerakan fisik setiap sendi robot (derajat kebebasan). Slider sudut di tab Sudut Sendi akan otomatis dibatasi oleh rentang ini.
            </div>

            {links.map((link, idx) => (
              <div
                key={link.id}
                className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-800 text-xs font-mono font-bold text-sky-400">
                      J{link.id}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{link.name}</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Rentang: [{link.minAngle}° s/d {link.maxAngle}°]
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                      Batas Minimum (Min):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={5}
                        max={link.maxAngle - 5}
                        value={link.minAngle}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateAngleRange(idx, val, link.maxAngle);
                          }
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                      <span className="text-xs font-mono text-slate-400">°</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                      Batas Maksimum (Max):
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step={5}
                        min={link.minAngle + 5}
                        value={link.maxAngle}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            onUpdateAngleRange(idx, link.minAngle, val);
                          }
                        }}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-mono text-slate-200 focus:border-sky-500 focus:outline-none"
                      />
                      <span className="text-xs font-mono text-slate-400">°</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: LINTASAN & WAYPOINTS (TRAJECTORY RECORDING) */}
        {activeTab === 'trajectory' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">Rekam Urutan Pose (Waypoints)</h3>
                  <p className="text-[11px] text-slate-400">
                    Simpan beberapa titik pose untuk simulasi animasi lintasan kontinu.
                  </p>
                </div>
                <button
                  onClick={onAddWaypoint}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-sky-400 transition shadow-sm"
                >
                  <BookmarkPlus className="h-3.5 w-3.5" />
                  <span>Simpan Pose</span>
                </button>
              </div>

              {waypoints.length > 0 && (
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={onPlayTrajectory}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold text-white transition ${
                      isPlayingTrajectory
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {isPlayingTrajectory ? (
                      <>
                        <Square className="h-4 w-4" />
                        <span>Hentikan Animasi</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <span>Jalankan Lintasan ({waypoints.length} Titik)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Waypoints list */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400">
                Daftar Titik Tersimpan ({waypoints.length}):
              </span>

              {waypoints.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
                  Belum ada waypoint tersimpan. Sesuaikan sendi robot dan klik &quot;Simpan Pose&quot; di atas.
                </div>
              ) : (
                waypoints.map((wp, i) => (
                  <div
                    key={wp.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-2.5"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 text-[10px] font-bold text-sky-300">
                          #{i + 1}
                        </span>
                        <span className="text-xs font-medium text-slate-200">{wp.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-slate-400">
                        <span>TCP: ({wp.tcp.x.toFixed(0)}, {wp.tcp.y.toFixed(0)}, {wp.tcp.z.toFixed(0)})</span>
                        <span>•</span>
                        <span>[{wp.angles.join('°, ')}°]</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onApplyPresetPose(wp.angles)}
                        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] text-sky-400 hover:bg-slate-700"
                        title="Terapkan Pose ini"
                      >
                        Pakai
                      </button>
                      <button
                        onClick={() => onDeleteWaypoint(wp.id)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400"
                        title="Hapus Waypoint"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
