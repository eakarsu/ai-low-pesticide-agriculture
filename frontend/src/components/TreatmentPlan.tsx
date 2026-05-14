const plans = [
  {
    id: 1,
    field: 'East Block 3',
    pest: 'Powdery Mildew',
    zones: ['Row 1–7, Section B', 'Row 1–3, Section C'],
    chemical: 'Copper-based fungicide',
    blanketVolume: '320 L',
    targetedVolume: '41 L',
    savings: '87%',
    chemicalSaved: '279 L',
    costSaved: '$2,100',
    completion: 0,
    priority: 'High',
  },
  {
    id: 2,
    field: 'West Field 2',
    pest: 'Cutworm infestation',
    zones: ['Row 18–26, Section D'],
    chemical: 'Bifenthrin (soil)',
    blanketVolume: '480 L',
    targetedVolume: '72 L',
    savings: '85%',
    chemicalSaved: '408 L',
    costSaved: '$3,800',
    completion: 30,
    priority: 'Medium',
  },
  {
    id: 3,
    field: 'North Field B',
    pest: 'Corn rootworm',
    zones: ['Row 6–11, Section B', 'Row 14–18, Section B'],
    chemical: 'Chlorpyrifos alternative',
    blanketVolume: '600 L',
    targetedVolume: '95 L',
    savings: '84%',
    chemicalSaved: '505 L',
    costSaved: '$4,200',
    completion: 65,
    priority: 'High',
  },
  {
    id: 4,
    field: 'South Orchard',
    pest: 'Spider mites + Codling moth',
    zones: ['Row 1–5, Sections B–C'],
    chemical: 'Neem oil + Kaolin clay',
    blanketVolume: '240 L',
    targetedVolume: '58 L',
    savings: '76%',
    chemicalSaved: '182 L',
    costSaved: '$1,400',
    completion: 90,
    priority: 'Low',
  },
  {
    id: 5,
    field: 'East Block 1',
    pest: 'Wireworm',
    zones: ['Row 15–20, Section A'],
    chemical: 'Tefluthrin granules',
    blanketVolume: '400 L',
    targetedVolume: '62 L',
    savings: '85%',
    chemicalSaved: '338 L',
    costSaved: '$2,900',
    completion: 15,
    priority: 'Medium',
  },
]

const priorityColor: Record<string, string> = {
  High: 'bg-red-100 text-red-800',
  Medium: 'bg-amber-100 text-amber-800',
  Low: 'bg-green-100 text-green-800',
}

export default function TreatmentPlan() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Active Treatment Plans</h2>
          <p className="text-sm text-stone-500">AI-optimized targeted spray zones</p>
        </div>
        <button className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-600 font-medium">+ New Plan</button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-xl border border-stone-200 p-6 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-stone-800">{plan.field}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor[plan.priority]}`}>
                    {plan.priority} Priority
                  </span>
                </div>
                <p className="text-sm text-stone-500 mt-0.5">{plan.pest}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-700">{plan.savings}</div>
                <div className="text-xs text-stone-400">chemical reduction</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-400 mb-1">Chemical</div>
                <div className="text-sm font-medium text-stone-700">{plan.chemical}</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-400 mb-1">Targeted Volume</div>
                <div className="text-sm font-medium text-green-700">{plan.targetedVolume}</div>
                <div className="text-xs text-stone-400">vs {plan.blanketVolume} blanket</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-400 mb-1">Chemical Saved</div>
                <div className="text-sm font-medium text-stone-700">{plan.chemicalSaved}</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3">
                <div className="text-xs text-stone-400 mb-1">Cost Saved</div>
                <div className="text-sm font-medium text-emerald-700">{plan.costSaved}</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs font-medium text-stone-500 mb-1.5">Targeted Zones</div>
              <div className="flex flex-wrap gap-2">
                {plan.zones.map((z) => (
                  <span key={z} className="px-2.5 py-1 bg-green-50 text-green-800 text-xs rounded-lg border border-green-200">{z}</span>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-stone-500 mb-1">
                <span>Completion</span>
                <span>{plan.completion}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${plan.completion === 100 ? 'bg-green-500' : 'bg-green-600'}`}
                  style={{ width: `${plan.completion}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
