import { Stethoscope } from 'lucide-react';
import AIToolPage from './AIToolPage';
import { api } from '../api';

export default function DiseaseEarlyWarningPage() {
  return (
    <AIToolPage
      title="Plant Disease Early-Warning"
      description="Differential diagnosis for likely plant diseases based on observed symptoms and recent detections."
      icon={Stethoscope}
      iconColor="bg-rose-100 text-rose-600"
      fields={[
        { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
        { key: 'observed_symptoms', label: 'Observed Symptoms', type: 'text', textarea: true, placeholder: 'Yellowing on lower leaves, spotting with concentric rings, wilting in afternoon heat...' },
      ]}
      buildPayload={(v) => ({
        field_id: v.field_id ? parseInt(v.field_id, 10) : undefined,
        observed_symptoms: v.observed_symptoms,
      })}
      callApi={(p) => api.diseaseEarlyWarning(p)}
      samples={[
        {
          label: 'Powdery mildew grape',
          values: {
            field_id: '3',
            observed_symptoms: 'Napa Cabernet, bloom stage. White powdery patches on upper leaf surface, beginning to colonize cluster rachis. Leaves cupping, mild chlorosis. Recent weather: warm days 75-82F, cool nights 55F, RH 75-90% mornings. No rain. Last sulfur dust 14 days ago.',
          },
        },
        {
          label: 'Verticillium strawberry',
          values: {
            field_id: '1',
            observed_symptoms: 'Salinas strawberry, 2nd year planting. Outer leaves wilting and turning reddish-brown along margins; younger leaves still green. Plants stunted in patches. Vascular discoloration visible when crown cut. Soil temp 68F. Field had tomatoes 2 seasons prior.',
          },
        },
        {
          label: 'Fire blight apple',
          values: {
            field_id: '5',
            observed_symptoms: 'Watsonville Gala apple block, post-bloom. Shoot tips bending into shepherd-crook, blackened from tip downward. Bacterial ooze on cankers. Recent weather: warm 70-78F with thunderstorms during bloom. Several blossom clusters wilted overnight.',
          },
        },
      ]}
    />
  );
}
