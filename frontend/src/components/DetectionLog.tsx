const detections = [
  { id: 1, timestamp: '2026-05-05 07:14', field: 'North Field A', pest: 'Aphid cluster', confidence: 94, location: 'Row 12, Section A', action: 'Targeted spray zone 12-A', status: 'treated' },
  { id: 2, timestamp: '2026-05-05 06:50', field: 'East Block 3', pest: 'Powdery mildew', confidence: 87, location: 'Row 5, Section B', action: 'Apply fungicide — 0.4L/sqm', status: 'pending' },
  { id: 3, timestamp: '2026-05-05 06:31', field: 'South Orchard', pest: 'Spider mites', confidence: 91, location: 'Row 3, Section C', action: 'Neem oil application', status: 'treated' },
  { id: 4, timestamp: '2026-05-05 05:58', field: 'West Field 2', pest: 'Cutworm', confidence: 78, location: 'Row 22, Section D', action: 'Soil-applied insecticide', status: 'pending' },
  { id: 5, timestamp: '2026-05-05 05:22', field: 'Greenhouse 1', pest: 'Whitefly', confidence: 96, location: 'Bay 4, Section A', action: 'Yellow sticky traps + spray', status: 'treated' },
  { id: 6, timestamp: '2026-05-04 20:17', field: 'North Field B', pest: 'Corn rootworm', confidence: 83, location: 'Row 8, Section B', action: 'Pheromone trap + spot spray', status: 'treated' },
  { id: 7, timestamp: '2026-05-04 18:45', field: 'East Block 1', pest: 'Wireworm', confidence: 75, location: 'Row 17, Section A', action: 'Granular soil insecticide', status: 'pending' },
  { id: 8, timestamp: '2026-05-04 16:02', field: 'Riverside Plot', pest: 'Thistle (weed)', confidence: 89, location: 'Row 1, Section C', action: 'Spot herbicide application', status: 'treated' },
  { id: 9, timestamp: '2026-05-04 14:30', field: 'South Orchard', pest: 'Codling moth', confidence: 92, location: 'Row 9, Section B', action: 'Kaolin clay + pheromone trap', status: 'treated' },
  { id: 10, timestamp: '2026-05-04 11:11', field: 'West Field 2', pest: 'Palmer amaranth', confidence: 88, location: 'Row 30, Section A', action: 'Pre-emergent herbicide', status: 'pending' },
]

export default function DetectionLog() {
  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-stone-800">Detection Log</h2>
          <p className="text-xs text-stone-400 mt-0.5">All AI-identified pests and weeds</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-600 hover:bg-stone-50">Export CSV</button>
          <button className="px-3 py-1.5 bg-green-700 text-white rounded-lg text-xs hover:bg-green-600">Filter</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-5 py-3">Timestamp</th>
              <th className="text-left px-5 py-3">Field</th>
              <th className="text-left px-5 py-3">Pest / Weed</th>
              <th className="text-left px-5 py-3">Confidence</th>
              <th className="text-left px-5 py-3">Location</th>
              <th className="text-left px-5 py-3">Recommended Action</th>
              <th className="text-left px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {detections.map((d) => (
              <tr key={d.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-5 py-3 text-stone-500 whitespace-nowrap">{d.timestamp}</td>
                <td className="px-5 py-3 font-medium text-stone-700 whitespace-nowrap">{d.field}</td>
                <td className="px-5 py-3 text-stone-600">{d.pest}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.confidence >= 90 ? 'bg-green-500' : d.confidence >= 80 ? 'bg-amber-400' : 'bg-orange-400'}`}
                        style={{ width: `${d.confidence}%` }}
                      />
                    </div>
                    <span className="text-stone-600">{d.confidence}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-stone-500 text-xs">{d.location}</td>
                <td className="px-5 py-3 text-stone-600 text-xs max-w-xs">{d.action}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    d.status === 'treated' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
