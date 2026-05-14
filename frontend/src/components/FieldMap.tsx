import { useState } from 'react'

type HealthStatus = 'healthy' | 'warning' | 'critical'

interface Field {
  id: number
  name: string
  crop: string
  lastScan: string
  health: HealthStatus
  acreage: number
  pestRisk: string
}

const fields: Field[] = [
  { id: 1, name: 'North Field A', crop: 'Corn', lastScan: '14 min ago', health: 'healthy', acreage: 42, pestRisk: 'Low' },
  { id: 2, name: 'North Field B', crop: 'Soybeans', lastScan: '1 hr ago', health: 'warning', acreage: 35, pestRisk: 'Medium' },
  { id: 3, name: 'East Block 1', crop: 'Wheat', lastScan: '2 hr ago', health: 'healthy', acreage: 58, pestRisk: 'Low' },
  { id: 4, name: 'East Block 3', crop: 'Barley', lastScan: '30 min ago', health: 'critical', acreage: 27, pestRisk: 'High' },
  { id: 5, name: 'South Orchard', crop: 'Apple Trees', lastScan: '45 min ago', health: 'warning', acreage: 19, pestRisk: 'Medium' },
  { id: 6, name: 'West Field 2', crop: 'Sunflower', lastScan: '3 hr ago', health: 'healthy', acreage: 63, pestRisk: 'Low' },
  { id: 7, name: 'Greenhouse 1', crop: 'Tomatoes', lastScan: '8 min ago', health: 'healthy', acreage: 2, pestRisk: 'Low' },
  { id: 8, name: 'Riverside Plot', crop: 'Alfalfa', lastScan: '5 hr ago', health: 'warning', acreage: 31, pestRisk: 'Medium' },
]

const healthConfig: Record<HealthStatus, { label: string; badge: string; border: string; bg: string }> = {
  healthy: { label: 'Healthy', badge: 'bg-green-100 text-green-800', border: 'border-green-200', bg: 'bg-green-50' },
  warning: { label: 'Warning', badge: 'bg-amber-100 text-amber-800', border: 'border-amber-200', bg: 'bg-amber-50' },
  critical: { label: 'Critical', badge: 'bg-red-100 text-red-800', border: 'border-red-200', bg: 'bg-red-50' },
}

export default function FieldMap() {
  const [scanning, setScanning] = useState<number | null>(null)

  const handleScan = (id: number) => {
    setScanning(id)
    setTimeout(() => setScanning(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Field Overview</h2>
          <p className="text-sm text-stone-500">8 active fields across 277 acres</p>
        </div>
        <div className="flex gap-3 text-sm">
          {(['healthy', 'warning', 'critical'] as HealthStatus[]).map((h) => (
            <span key={h} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${healthConfig[h].badge}`}>
              <span className={`w-2 h-2 rounded-full ${h === 'healthy' ? 'bg-green-500' : h === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
              {healthConfig[h].label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {fields.map((field) => {
          const cfg = healthConfig[field.health]
          return (
            <div key={field.id} className={`rounded-xl border-2 p-5 bg-white ${cfg.border} hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-stone-800 text-sm">{field.name}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{field.acreage} acres</div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Crop</span>
                  <span className="text-stone-700 font-medium">{field.crop}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Last Scan</span>
                  <span className="text-stone-700">{field.lastScan}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-stone-500">Pest Risk</span>
                  <span className={`font-medium ${field.pestRisk === 'Low' ? 'text-green-600' : field.pestRisk === 'Medium' ? 'text-amber-600' : 'text-red-600'}`}>
                    {field.pestRisk}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleScan(field.id)}
                className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
                  scanning === field.id
                    ? 'bg-green-600 text-white animate-pulse'
                    : 'bg-green-700 hover:bg-green-600 text-white'
                }`}
              >
                {scanning === field.id ? 'Scanning...' : 'Scan Now'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
