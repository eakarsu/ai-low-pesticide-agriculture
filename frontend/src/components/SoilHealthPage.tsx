import { Mountain } from 'lucide-react';
import AIToolPage from './AIToolPage';
import { api } from '../api';

export default function SoilHealthPage() {
  return (
    <AIToolPage
      title="Soil Health Analyzer"
      description="Score soil health and recommend regenerative low-input practices using field history and observations."
      icon={Mountain}
      iconColor="bg-stone-100 text-stone-600"
      fields={[
        { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
        { key: 'soil_observations', label: 'Soil Observations', type: 'text', textarea: true, placeholder: 'Crusting after rain, compaction below 15cm, low earthworm activity...' },
      ]}
      buildPayload={(v) => ({
        field_id: v.field_id ? parseInt(v.field_id, 10) : undefined,
        soil_observations: v.soil_observations,
      })}
      callApi={(p) => api.soilHealth(p)}
      samples={[
        {
          label: 'Strawberry sandy loam',
          values: {
            field_id: '1',
            soil_observations: 'Pajaro Valley sandy loam, OM 1.8%, pH 6.4. Surface crusting after fumigation/drip cycles. Compaction at 20cm from bedshaping. Few earthworms; nematode pressure history. Cover crop residue (mustard) incorporated 4 weeks ago.',
          },
        },
        {
          label: 'Almond clay loam',
          values: {
            field_id: '2',
            soil_observations: 'San Joaquin Valley clay loam, OM 0.9%, pH 7.8, EC 1.4 dS/m. Hardpan at 45cm; ponding in winter. Low infiltration, leaf analysis shows zinc deficiency. Drive rows compacted from harvest equipment. No cover crop last 3 seasons.',
          },
        },
        {
          label: 'Vineyard hillside',
          values: {
            field_id: '3',
            soil_observations: 'Napa hillside vineyard, decomposed granite topsoil 30cm over fractured rock. OM 2.1%, pH 6.7. Erosion in middle rows after winter rain. Resident vegetation sparse. Vine vigor uneven, chlorosis on calcareous patches.',
          },
        },
      ]}
    />
  );
}
