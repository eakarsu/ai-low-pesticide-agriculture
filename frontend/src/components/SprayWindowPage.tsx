import { Wind } from 'lucide-react';
import AIToolPage from './AIToolPage';
import { api } from '../api';

export default function SprayWindowPage() {
  return (
    <AIToolPage
      title="Spray-Window Predictor"
      description="Recommend the optimal low-drift, low-stress spray window for a target pest, given field and recent weather."
      icon={Wind}
      iconColor="bg-sky-100 text-sky-600"
      fields={[
        { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
        { key: 'target_pest', label: 'Target Pest', type: 'text', placeholder: 'Aphids' },
        { key: 'weather_summary', label: 'Weather Notes (optional)', type: 'text', placeholder: 'Light wind expected next 3 days', textarea: true },
      ]}
      buildPayload={(v) => ({
        field_id: v.field_id ? parseInt(v.field_id, 10) : undefined,
        target_pest: v.target_pest,
        weather_summary: v.weather_summary,
      })}
      callApi={(p) => api.sprayWindow(p)}
      samples={[
        {
          label: 'Codling moth in apples',
          values: {
            field_id: '1',
            target_pest: 'Codling moth',
            weather_summary: 'Watsonville CA, next 5 days: temps 62-78F, RH 55-70%, wind 3-7mph SW mornings, no rain forecast. Degree-day model shows biofix +250 DD, peak egg hatch in 48-72h.',
          },
        },
        {
          label: 'Navel orangeworm almonds',
          values: {
            field_id: '2',
            target_pest: 'Navel orangeworm',
            weather_summary: 'Madera County almond orchard, hull split underway. Forecast: 85-95F, RH 30-45%, light NW wind 4-8mph at dawn, calm 6am-9am. No precipitation 7-day outlook.',
          },
        },
        {
          label: 'Lygus bug strawberry',
          values: {
            field_id: '3',
            target_pest: 'Lygus bug',
            weather_summary: 'Salinas Valley strawberry, marine layer mornings clearing by 10am. Temps 58-70F, RH 70-85%, wind 2-5mph onshore afternoons. Bloom present, pollinators active 10am-3pm.',
          },
        },
      ]}
    />
  );
}
