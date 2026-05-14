import { Bug } from 'lucide-react';
import AIToolPage from './AIToolPage';
import { api } from '../api';

export default function BeneficialInsectsPage() {
  return (
    <AIToolPage
      title="Beneficial Insect Identifier"
      description="Identify likely beneficial insects from scout notes and recommend ways to support populations."
      icon={Bug}
      iconColor="bg-emerald-100 text-emerald-600"
      fields={[
        { key: 'field_id', label: 'Field ID', type: 'number', placeholder: '1' },
        { key: 'observation_notes', label: 'Scout Notes', type: 'text', textarea: true, placeholder: 'Small black-spotted red beetles on aphid clusters, tiny wasps near brassicas, hover-flies on flower strip...' },
      ]}
      buildPayload={(v) => ({
        field_id: v.field_id ? parseInt(v.field_id, 10) : undefined,
        observation_notes: v.observation_notes,
      })}
      callApi={(p) => api.beneficialInsects(p)}
      samples={[
        {
          label: 'Lady beetles on lettuce',
          values: {
            field_id: '4',
            observation_notes: 'Salinas Valley romaine, head formation stage. Convergent lady beetle adults (orange w/ black spots) and yellow alligator-shaped larvae feeding on aphid colonies along outer rows. ~12 adults and 25 larvae per 50ft transect. Sweet alyssum insectary strip flowering on field margin.',
          },
        },
        {
          label: 'Parasitic wasps almond',
          values: {
            field_id: '2',
            observation_notes: 'Madera almond orchard. Tiny (2-3mm) dark wasps observed on NOW egg traps and around mummy nuts. Mummified aphids ("aphid mummies") tan and papery on weed hosts in cover crop. Trichogramma release card residues from 10 days ago. Hover-flies on flowering vetch.',
          },
        },
        {
          label: 'Lacewings on strawberry',
          values: {
            field_id: '1',
            observation_notes: 'Watsonville strawberry. Green lacewing eggs on stalks under leaves, and larvae ("aphid lions") with sickle jaws feeding on spider mites and aphids. Adult lacewings active at dusk. Syrphid (hoverfly) maggots also present. Bloom strip of buckwheat in adjacent border.',
          },
        },
      ]}
    />
  );
}
