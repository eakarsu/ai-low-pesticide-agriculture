import { useState } from 'react';
import { Sparkles, Bug, BarChart3, FlaskConical, FileText } from 'lucide-react';
import { api } from '../api';
import AIResponse from './AIResponse';

interface AITool {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  fields: { key: string; label: string; type: string; placeholder: string }[];
  samples?: { label: string; values: Record<string, string> }[];
}

const tools: AITool[] = [
  {
    id: 'pest-analysis',
    title: 'Pest Pattern Analysis',
    description: 'Analyze pest detection patterns and get targeted treatment recommendations to minimize chemical use.',
    icon: Bug,
    color: 'bg-orange-100 text-orange-600',
    fields: [
      { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
      { key: 'pest_names', label: 'Pest Names (comma-separated)', type: 'text', placeholder: 'Aphids, Corn Earworm' },
    ],
    samples: [
      { label: 'Strawberry pests', values: { field_id: '1', pest_names: 'Lygus bug, Two-spotted spider mite, Aphids' } },
      { label: 'Almond pests', values: { field_id: '2', pest_names: 'Navel orangeworm, Peach twig borer, Web-spinning mite' } },
      { label: 'Vineyard pests', values: { field_id: '3', pest_names: 'Vine mealybug, Pacific spider mite, Western grape leafhopper' } },
    ],
  },
  {
    id: 'yield-prediction',
    title: 'Yield Prediction',
    description: 'Predict crop yield based on health data, weather conditions, and field parameters.',
    icon: BarChart3,
    color: 'bg-blue-100 text-blue-600',
    fields: [
      { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
      { key: 'crop_type', label: 'Crop Type', type: 'text', placeholder: 'corn' },
      { key: 'health_score', label: 'Current Health Score', type: 'number', placeholder: '80' },
    ],
    samples: [
      { label: 'Strawberry healthy', values: { field_id: '1', crop_type: 'strawberry', health_score: '88' } },
      { label: 'Almond stressed', values: { field_id: '2', crop_type: 'almond', health_score: '64' } },
      { label: 'Lettuce vigorous', values: { field_id: '4', crop_type: 'lettuce', health_score: '92' } },
    ],
  },
  {
    id: 'treatment-plan',
    title: 'Treatment Plan Generator',
    description: 'Generate an optimized treatment plan that minimizes chemical usage while effectively controlling pests.',
    icon: FlaskConical,
    color: 'bg-purple-100 text-purple-600',
    fields: [
      { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
      { key: 'pest_detections', label: 'Pest Detections (describe)', type: 'text', placeholder: 'High aphid pressure in northeast, medium armyworm in center' },
    ],
    samples: [
      { label: 'Codling moth orchard', values: { field_id: '5', pest_detections: 'High codling moth trap counts (28/trap/wk) in apple block, low overall powdery mildew pressure, beneficial lacewing population intact.' } },
      { label: 'Aphid + mite strawberry', values: { field_id: '1', pest_detections: 'Heavy aphid colonies on outer rows, two-spotted spider mite hot spots in center, Lygus bug counts 1.2/sweep, lady beetles present.' } },
      { label: 'NOW almond hull split', values: { field_id: '2', pest_detections: 'Navel orangeworm egg traps rising at hull split, mummy load 1.8/tree from sanitation, peach twig borer adults in pheromone traps.' } },
    ],
  },
  {
    id: 'field-summary',
    title: 'Comprehensive Field Summary',
    description: 'Generate a complete field status report with sustainability score and priority actions.',
    icon: FileText,
    color: 'bg-green-100 text-green-600',
    fields: [
      { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
    ],
    samples: [
      { label: 'Strawberry field 1', values: { field_id: '1' } },
      { label: 'Almond field 2', values: { field_id: '2' } },
      { label: 'Vineyard field 3', values: { field_id: '3' } },
    ],
  },
];

interface HistoryItem {
  toolId: string;
  title: string;
  content: string;
  timestamp: Date;
}

export default function AICenter() {
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [loadingTool, setLoadingTool] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const setField = (toolId: string, key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: value } }));
  };

  const runTool = async (tool: AITool) => {
    setLoadingTool(tool.id);
    setResults(prev => ({ ...prev, [tool.id]: '' }));
    try {
      const values = formValues[tool.id] || {};
      let result = '';

      if (tool.id === 'pest-analysis') {
        const { result: r } = await api.pestAnalysis({
          field_id: parseInt(values.field_id || '1'),
          detections: [{ pest_name: values.pest_names || 'Unknown pest', severity: 'medium' }],
        });
        result = r;
      } else if (tool.id === 'yield-prediction') {
        const { result: r } = await api.yieldPrediction({
          field_id: parseInt(values.field_id || '1'),
          health_data: { health_score: parseInt(values.health_score || '75'), crop_type: values.crop_type },
          weather_data: {},
        });
        result = r;
      } else if (tool.id === 'treatment-plan') {
        const { result: r } = await api.treatmentPlan({
          field_id: parseInt(values.field_id || '1'),
          pest_detections: [{ description: values.pest_detections }],
        });
        result = r;
      } else if (tool.id === 'field-summary') {
        const { result: r } = await api.fieldSummary({ field_id: parseInt(values.field_id || '1') });
        result = r;
      }

      setResults(prev => ({ ...prev, [tool.id]: result }));
      setHistory(prev => [{ toolId: tool.id, title: tool.title, content: result, timestamp: new Date() }, ...prev.slice(0, 9)]);
    } catch (e: any) {
      setResults(prev => ({ ...prev, [tool.id]: 'Error: ' + e.message }));
    } finally {
      setLoadingTool(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-violet-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Center</h2>
            <p className="text-gray-500 text-sm">AI-powered analysis tools for precision agriculture</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tools.map(tool => {
          const Icon = tool.icon;
          const isLoading = loadingTool === tool.id;
          const result = results[tool.id];
          const values = formValues[tool.id] || {};

          return (
            <div key={tool.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tool.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{tool.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{tool.description}</p>
                </div>
              </div>

              {tool.samples && tool.samples.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-600 mb-2">Try a sample:</div>
                  <div className="flex flex-wrap gap-2">
                    {tool.samples.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormValues(prev => ({ ...prev, [tool.id]: s.values }))}
                        className="px-3 py-1.5 text-xs bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded-full transition-colors"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 mb-4">
                {tool.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                    <input
                      type={field.type}
                      value={values[field.key] || ''}
                      onChange={e => setField(tool.id, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() => runTool(tool)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors mb-4"
              >
                <Sparkles className="w-4 h-4" />
                {isLoading ? 'Generating...' : 'Generate Analysis'}
              </button>

              {(isLoading || result) && (
                <AIResponse
                  content={result}
                  title={tool.title}
                  isLoading={isLoading}
                  onRegenerate={() => runTool(tool)}
                />
              )}
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <h3 className="font-bold text-gray-900 mb-4">Recent Queries</h3>
          <div className="space-y-3">
            {history.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-gray-900">{item.title}</span>
                  <span className="text-xs text-gray-400">{item.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{item.content.slice(0, 150)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
