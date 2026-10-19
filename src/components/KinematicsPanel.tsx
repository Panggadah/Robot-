import React, { useState } from 'react';
import { Copy, Check, Table, Grid3X3, Compass, Maximize2 } from 'lucide-react';
import { KinematicsResult, LinkConfig } from '../types/robot';

interface KinematicsPanelProps {
  kinematics: KinematicsResult;
  links: LinkConfig[];
}

export const KinematicsPanel: React.FC<KinematicsPanelProps> = ({ kinematics, links }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'dh' | 'matrix' | 'joints'>('summary');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const tcp = kinematics.tcp;

  return (
    <div className="flex h-full flex-col bg-slate-900 border-l border-slate-800 text-slate-100 shadow-2xl">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-slate-950/60 p-3">
        <div className="flex items-center justify-between pb-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Compass className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold tracking-wide text-white">Hasil Kinematika &amp; TCP</h2>
              <p className="text-[11px] text-slate-400">Koordinat Akhir Ujung Lengan Robot</p>
            </div>
          </div>

          <button
            onClick={() =>
              copyToClipboard(
                `X: ${tcp.x.toFixed(2)} mm, Y: ${tcp.y.toFixed(2)} mm, Z: ${tcp.z.toFixed(2)} mm`,
                'all-tcp'
              )
            }
            className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            {copiedKey === 'all-tcp' ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Salin TCP</span>
              </>
            )}
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-900/90 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition ${
              activeTab === 'summary' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Ringkasan</span>
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition ${
              activeTab === 'matrix' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3X3 className="h-3 w-3" />
            <span>Matriks T</span>
          </button>
          <button
            onClick={() => setActiveTab('dh')}
            className={`flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition ${
              activeTab === 'dh' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="h-3 w-3" />
            <span>Tabel DH</span>
          </button>
          <button
            onClick={() => setActiveTab('joints')}
            className={`flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition ${
              activeTab === 'joints' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Sendi J0-J5</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SUMMARY OF COORDINATES & ORIENTATION */}
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Primary Cartesian Coordinates (X, Y, Z) */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Koordinat Kartesius Ujung Lengan (TCP):
              </span>
              <div className="grid grid-cols-3 gap-2">
                {/* X */}
                <div className="relative rounded-xl border border-red-900/40 bg-red-950/20 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-red-400">
                    <span>Sumbu X (Lateral)</span>
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono text-slate-100">
                    {tcp.x.toFixed(1)}
                    <span className="text-xs font-normal text-slate-400 ml-1">mm</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(tcp.x / 1000).toFixed(3)} m
                  </div>
                </div>

                {/* Y */}
                <div className="relative rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
                    <span>Sumbu Y (Tinggi)</span>
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono text-slate-100">
                    {tcp.y.toFixed(1)}
                    <span className="text-xs font-normal text-slate-400 ml-1">mm</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(tcp.y / 1000).toFixed(3)} m
                  </div>
                </div>

                {/* Z */}
                <div className="relative rounded-xl border border-blue-900/40 bg-blue-950/20 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-blue-400">
                    <span>Sumbu Z (Depan)</span>
                  </div>
                  <div className="mt-1 text-xl font-bold font-mono text-slate-100">
                    {tcp.z.toFixed(1)}
                    <span className="text-xs font-normal text-slate-400 ml-1">mm</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {(tcp.z / 1000).toFixed(3)} m
                  </div>
                </div>
              </div>
            </div>

            {/* Reach & Radial distance */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Total Jangkauan (Reach Distance):</span>
                <span className="text-sm font-bold font-mono text-sky-400">{tcp.reach.toFixed(1)} mm</span>
              </div>
              {/* Progress bar of current reach vs max reach */}
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (tcp.reach / kinematics.maxReach) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>0 mm</span>
                  <span>Maks. Teoritis: {kinematics.maxReach} mm</span>
                </div>
              </div>
            </div>

            {/* Orientation (Roll, Pitch, Yaw) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Orientasi Sudut Euler (Roll, Pitch, Yaw):
              </span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Roll (ϕ)</div>
                  <div className="text-sm font-bold font-mono text-slate-200">{tcp.roll}°</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Pitch (θ)</div>
                  <div className="text-sm font-bold font-mono text-slate-200">{tcp.pitch}°</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Yaw (ψ)</div>
                  <div className="text-sm font-bold font-mono text-slate-200">{tcp.yaw}°</div>
                </div>
              </div>
            </div>

            {/* Quaternion Vector */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Representasi Quaternion (q):
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(tcp.quaternion),
                      'quat'
                    )
                  }
                  className="text-[10px] text-sky-400 hover:underline"
                >
                  {copiedKey === 'quat' ? 'Tersalin' : 'Salin'}
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono">
                <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">w</span>
                  <span className="text-slate-200">{tcp.quaternion.w}</span>
                </div>
                <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">x</span>
                  <span className="text-slate-200">{tcp.quaternion.x}</span>
                </div>
                <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">y</span>
                  <span className="text-slate-200">{tcp.quaternion.y}</span>
                </div>
                <div className="rounded bg-slate-900 p-1.5 border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">z</span>
                  <span className="text-slate-200">{tcp.quaternion.z}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HOMOGENEOUS TRANSFORMATION MATRIX */}
        {activeTab === 'matrix' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  Matriks Transformasi Homogen T₀⁵ (4×4)
                </h3>
                <p className="text-[10px] text-slate-400">
                  Kolom 1-3: Rotasi R₃×₃ | Kolom 4: Translasi Posisi P₃×₁ (mm)
                </p>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(kinematics.transformationMatrix),
                    'matrix'
                  )
                }
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-300 hover:text-white"
              >
                <Copy className="h-3 w-3" />
                <span>{copiedKey === 'matrix' ? 'Tersalin' : 'Salin Matriks'}</span>
              </button>
            </div>

            {/* Visual Matrix Container */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-3 font-mono text-xs">
              <table className="w-full text-center">
                <tbody>
                  {kinematics.transformationMatrix.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-900/60 last:border-b-0">
                      {row.map((val, cIdx) => {
                        const isTranslation = cIdx === 3;
                        const isScale = rIdx === 3 && cIdx === 3;
                        return (
                          <td
                            key={cIdx}
                            className={`p-2 font-semibold ${
                              isScale
                                ? 'text-slate-500'
                                : isTranslation
                                ? 'text-sky-400 bg-sky-950/20 rounded'
                                : 'text-slate-200'
                            }`}
                          >
                            {val.toFixed(3)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Keterangan Elemen:</span>
              <p>• Angka kolom biru (kanan) mewakili koordinat translasi akhir TCP: X, Y, Z (mm).</p>
              <p>• Sub-matriks 3x3 kiri mewakili tensor rotasi ortogonal pemutar ujung lengan.</p>
            </div>
          </div>
        )}

        {/* TAB 3: DENAVIT-HARTENBERG PARAMETER TABLE */}
        {activeTab === 'dh' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">
                Tabel Parameter Denavit-Hartenberg (DH)
              </h3>
              <p className="text-[10px] text-slate-400">
                Konvensi standar robotika untuk pemodelan kinematika maju
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
              <table className="w-full text-left text-xs font-mono">
                <thead className="border-b border-slate-800 bg-slate-900 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Sendi (i)</th>
                    <th className="p-2.5">θᵢ (Sudut)</th>
                    <th className="p-2.5">dᵢ (Offset)</th>
                    <th className="p-2.5">aᵢ (Panjang)</th>
                    <th className="p-2.5">αᵢ (Twist)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {kinematics.dhTable.map((dh) => (
                    <tr key={dh.joint} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-bold text-sky-400">Sendi {dh.joint}</td>
                      <td className="p-2.5 text-slate-200">{dh.theta.toFixed(1)}°</td>
                      <td className="p-2.5 text-slate-300">{dh.d} mm</td>
                      <td className="p-2.5 text-slate-300">{dh.a} mm</td>
                      <td className="p-2.5 text-slate-300">{dh.alpha}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 text-[11px] text-slate-400 space-y-1">
              <p>• <strong>θᵢ (Theta)</strong>: Sudut rotasi terhadap sumbu Zᵢ₋₁</p>
              <p>• <strong>dᵢ (Distance)</strong>: Jarak translasi sepanjang sumbu Zᵢ₋₁</p>
              <p>• <strong>aᵢ (Length)</strong>: Jarak translasi sepanjang sumbu Xᵢ (panjang link)</p>
              <p>• <strong>αᵢ (Alpha)</strong>: Sudut rotasi twist terhadap sumbu Xᵢ</p>
            </div>
          </div>
        )}

        {/* TAB 4: INTERMEDIATE JOINT COORDINATES */}
        {activeTab === 'joints' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-slate-200">
                Koordinat 3D Setiap Titik Sendi (J0 - J5)
              </h3>
              <p className="text-[10px] text-slate-400">
                Posisi absolut titik sendi dalam sistem koordinat kartesius Three.js
              </p>
            </div>

            <div className="space-y-2">
              {kinematics.joints.map((joint) => (
                <div
                  key={joint.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold ${
                        joint.id === 5
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      J{joint.id}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{joint.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {joint.id === 0
                          ? 'Pusat Dasar Robot'
                          : joint.id === 1
                          ? `Tinggi L1 = ${links[0].length} mm`
                          : joint.id === 5
                          ? 'Ujung Alat / TCP'
                          : `Siku / Pergelangan`}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs text-slate-300">
                    <div>
                      X: <span className="text-red-400 font-semibold">{joint.x.toFixed(1)}</span>
                    </div>
                    <div>
                      Y: <span className="text-emerald-400 font-semibold">{joint.y.toFixed(1)}</span>
                    </div>
                    <div>
                      Z: <span className="text-blue-400 font-semibold">{joint.z.toFixed(1)}</span> mm
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
