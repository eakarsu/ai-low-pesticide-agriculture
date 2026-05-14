import { ShieldAlert } from 'lucide-react';
import AIToolPage from './AIToolPage';
import { api } from '../api';

export default function ResidueRiskPage() {
  return (
    <AIToolPage
      title="Pesticide Residue Risk Scorer"
      description="Score residue risk for produce harvested from a field, based on recent treatments and harvest date."
      icon={ShieldAlert}
      iconColor="bg-amber-100 text-amber-600"
      fields={[
        { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
        { key: 'harvest_date', label: 'Planned Harvest Date', type: 'date' },
      ]}
      buildPayload={(v) => ({
        field_id: v.field_id ? parseInt(v.field_id, 10) : undefined,
        harvest_date: v.harvest_date,
      })}
      callApi={(p) => api.residueRisk(p)}
      samples={[
        {
          label: 'Strawberry harvest 7d',
          values: {
            field_id: '1',
            harvest_date: '2026-05-14',
          },
        },
        {
          label: 'Lettuce harvest 14d',
          values: {
            field_id: '4',
            harvest_date: '2026-05-21',
          },
        },
        {
          label: 'Vineyard harvest 30d',
          values: {
            field_id: '2',
            harvest_date: '2026-06-06',
          },
        },
      ]}
    />
  );
}
