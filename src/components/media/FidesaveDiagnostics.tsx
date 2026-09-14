import React, { useState, useEffect } from 'react';
import { Terminal, ShieldAlert, CheckCircle, RefreshCw, Copy, ExternalLink, Activity, Server, AlertTriangle } from 'lucide-react';

export interface LogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  statusText: string;
  requestPayload?: any;
  responsePayload?: any;
  error?: string;
  durationMs: number;
}

interface FidesaveDiagnosticsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  onRunHealthCheck: () => void;
  healthStatus: any;
  healthLoading: boolean;
}

export default function FidesaveDiagnostics({
  logs,
  onClearLogs,
  onRunHealthCheck,
  healthStatus,
  healthLoading
}: FidesaveDiagnosticsProps) {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyLogs = () => {
    const report = JSON.stringify({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      healthStatus,
      logs
    }, null, 2);
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-zinc-100 shadow-xl mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-lg text-white">FideSave Production & API Diagnostics</h3>
          </div>
          <p className="text-sm text-zinc-400 mt-0.5">
            Real-time telemetry tracking request paths, payload parameters, and server-side responses.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onRunHealthCheck}
            disabled={healthLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-medium transition shadow-sm"
          >
            {healthLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            Test API Health
          </button>
          <button
            onClick={handleCopyLogs}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition border border-zinc-700"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied ? 'Copied Report!' : 'Export Report'}
          </button>
          <button
            onClick={onClearLogs}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl text-xs font-medium transition border border-zinc-700"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Health Status Bar */}
      {healthStatus && (
        <div className="my-4 p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${healthStatus.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <div>
              <span className="font-medium text-zinc-300">Endpoint Status: </span>
              <span className={healthStatus.status === 'ok' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {healthStatus.status === 'ok' ? 'Operational' : 'Degraded / Error'}
              </span>
              <span className="text-zinc-500 ml-3">Environment: {healthStatus.environment || 'container'}</span>
            </div>
          </div>
          <span className="text-zinc-500 font-mono text-[11px]">{healthStatus.timestamp}</span>
        </div>
      )}

      {/* Logs Table / List */}
      <div className="mt-4">
        {logs.length === 0 ? (
          <div className="text-center py-10 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800">
            <Server className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No API requests recorded yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Paste a media URL above and click Analyze to trace the request path.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {logs.map((log) => {
              const isSuccess = log.status >= 200 && log.status < 300;
              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                    isSuccess
                      ? 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'
                      : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                      isSuccess ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {log.method}
                    </span>
                    <span className="font-mono text-zinc-200 truncate">{log.path}</span>
                    <span className="text-zinc-500 font-mono">({log.durationMs}ms)</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isSuccess ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'
                    }`}>
                      {log.status} {log.statusText}
                    </span>
                    <span className="text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-mono text-xs font-bold uppercase ${
                  selectedLog.status >= 200 && selectedLog.status < 300 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}>
                  {selectedLog.method}
                </span>
                <span className="font-mono text-sm font-semibold text-white">{selectedLog.path}</span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-zinc-800/60"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Status Code</span>
                  <span className={selectedLog.status >= 200 && selectedLog.status < 300 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {selectedLog.status} {selectedLog.statusText}
                  </span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Response Time</span>
                  <span className="text-zinc-200">{selectedLog.durationMs}ms</span>
                </div>
              </div>

              {selectedLog.requestPayload && (
                <div>
                  <span className="text-zinc-400 font-semibold block mb-1">Request Payload:</span>
                  <pre className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-zinc-300 overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.requestPayload, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <span className="text-zinc-400 font-semibold block mb-1">Server Response:</span>
                <pre className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-zinc-300 overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.responsePayload || selectedLog.error, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-800 bg-zinc-950/60 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-medium transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
