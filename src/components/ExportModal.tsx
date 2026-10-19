import React, { useState } from 'react';
import { X, FileSpreadsheet, FileCode, Download, Copy, Check } from 'lucide-react';
import { KinematicsResult, LinkConfig, Waypoint } from '../types/robot';
import { exportKinematicsToCSV, exportKinematicsToJSON } from '../utils/export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  links: LinkConfig[];
  kinematics: KinematicsResult;
  waypoints: Waypoint[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  links,
  kinematics,
  waypoints,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [includeWaypoints, setIncludeWaypoints] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate preview data
  const generatePreview = () => {
    if (selectedFormat === 'json') {
      const payload = {
        metadata: {
          app: '5-DOF Robot Kinematics Simulator',
          exportedAt: new Date().toISOString(),
        },
        endEffector_TCP: kinematics.tcp,
        linkConfigurations: links,
        transformationMatrix_T05: kinematics.transformationMatrix,
        denavitHartenbergTable: kinematics.dhTable,
        waypoints: includeWaypoints ? waypoints : [],
      };
      return JSON.stringify(payload, null, 2);
    } else {
      const lines = [
        '# 5-DOF Robot Arm Kinematics Export (CSV Preview)',
        `# Timestamp: ${new Date().toISOString()}`,
        '--- END EFFECTOR (TCP) ---',
        'Parameter,Value,Unit',
        `TCP_X,${kinematics.tcp.x},mm`,
        `TCP_Y,${kinematics.tcp.y},mm`,
        `TCP_Z,${kinematics.tcp.z},mm`,
        `Total_Reach,${kinematics.tcp.reach},mm`,
        `Roll,${kinematics.tcp.roll},deg`,
        `Pitch,${kinematics.tcp.pitch},deg`,
        `Yaw,${kinematics.tcp.yaw},deg`,
        '',
        '--- JOINTS & LINKS ---',
        'Joint_ID,Name,Length_mm,Min_deg,Max_deg,Current_deg',
        ...links.map(
          (l) => `${l.id},${l.name},${l.length},${l.minAngle},${l.maxAngle},${l.currentAngle}`
        ),
      ];
      if (includeWaypoints && waypoints.length > 0) {
        lines.push('');
        lines.push(`--- WAYPOINTS (${waypoints.length}) ---`);
        lines.push('ID,Name,Angles,TCP_XYZ');
        waypoints.forEach((wp) =>
          lines.push(`${wp.id},${wp.name},"[${wp.angles.join(',')}]","[${wp.tcp.x},${wp.tcp.y},${wp.tcp.z}]"`)
        );
      }
      return lines.join('\n');
    }
  };

  const handleDownload = () => {
    const wpList = includeWaypoints ? waypoints : [];
    if (selectedFormat === 'csv') {
      exportKinematicsToCSV(links, kinematics, wpList);
    } else {
      exportKinematicsToJSON(links, kinematics, wpList);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(generatePreview());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative flex w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Ekspor Data Kinematika Robot</h3>
              <p className="text-xs text-slate-400">
                Unduh hasil perhitungan posisi TCP dan parameter lengan robot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Format Selection Buttons */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Pilih Format File:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* CSV Option */}
              <button
                type="button"
                onClick={() => setSelectedFormat('csv')}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  selectedFormat === 'csv'
                    ? 'border-sky-500 bg-sky-500/10 text-white shadow-md shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Format CSV (.csv)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Cocok untuk Microsoft Excel, Google Sheets, analisis data Pandas / MATLAB.
                  </div>
                </div>
              </button>

              {/* JSON Option */}
              <button
                type="button"
                onClick={() => setSelectedFormat('json')}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  selectedFormat === 'json'
                    ? 'border-sky-500 bg-sky-500/10 text-white shadow-md shadow-sky-500/10'
                    : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                  <FileCode className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Format JSON (.json)</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    Cocok untuk integrasi API, ROS, simulasi Python, dan pertukaran data web.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Options */}
          {waypoints.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeWaypoints}
                onChange={(e) => setIncludeWaypoints(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
              />
              <span>Sertakan rekaman lintasan waypoints ({waypoints.length} titik)</span>
            </label>
          )}

          {/* Code Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">
                Pratinjau Data ({selectedFormat.toUpperCase()}):
              </span>
              <button
                onClick={handleCopyPreview}
                className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:text-white"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>
            </div>
            <pre className="h-44 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
              {generatePreview()}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
          >
            Tutup
          </button>
          <button
            onClick={() => {
              handleDownload();
              onClose();
            }}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 transition"
          >
            <Download className="h-4 w-4" />
            <span>Unduh File {selectedFormat.toUpperCase()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
