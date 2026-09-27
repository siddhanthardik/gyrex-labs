'use client';

import React, { useEffect, useState } from 'react';
import { Settings, Save, ShieldAlert, CheckCircle, RefreshCw } from 'lucide-react';

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/superadmin/system/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || []);
        const vals: Record<string, string> = {};
        (data.settings || []).forEach((s: PlatformSetting) => {
          vals[s.key] = s.value;
        });
        setFormValues(vals);
      } else {
        setErrorMsg('Failed to load platform settings');
      }
    } catch {
      setErrorMsg('Network error loading platform settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string) => {
    setSavingKey(key);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/superadmin/system/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: formValues[key] || '' }),
      });
      if (res.ok) {
        setSuccessMsg(`Setting '${key}' updated successfully.`);
        fetchSettings();
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to update setting');
      }
    } catch {
      setErrorMsg('Failed to update setting due to network error');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            Platform Settings
          </h1>
          <p className="text-sm text-slate-500">
            Configure system-wide operational parameters, support contacts, and store defaults.
          </p>
        </div>
        <button
          onClick={fetchSettings}
          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-800">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-sm text-rose-800">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h2 className="font-semibold text-slate-900 text-sm">Essential System Configurations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Only genuine platform parameters are displayed. Sensitive secrets (API keys, webhook secrets) are never editable from this view.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading platform settings...</div>
        ) : settings.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No settings found in system configuration.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {settings.map((s) => (
              <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="md:w-1/3">
                  <div className="font-medium text-sm text-slate-900 font-mono">{s.key}</div>
                  <div className="text-xs text-slate-500 mt-1">{s.description || 'System setting'}</div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Last updated: {new Date(s.updatedAt).toLocaleString()}
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-3">
                  {s.key.includes('maintenance') || s.key.includes('registration') ? (
                    <select
                      value={formValues[s.key] ?? s.value}
                      onChange={(e) => setFormValues({ ...formValues, [s.key]: e.target.value })}
                      className="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-800"
                    >
                      <option value="false">Disabled / False</option>
                      <option value="true">Enabled / True</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formValues[s.key] ?? s.value}
                      onChange={(e) => setFormValues({ ...formValues, [s.key]: e.target.value })}
                      className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  )}

                  <button
                    onClick={() => handleSave(s.key)}
                    disabled={savingKey === s.key || formValues[s.key] === s.value}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium disabled:opacity-40 transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === s.key ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
