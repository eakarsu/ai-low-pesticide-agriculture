import PesticideHeatmap from './PesticideHeatmap';
import IpmEfficacyChart from './IpmEfficacyChart';
import FieldApplicationReport from './FieldApplicationReport';
import TreatmentScheduler from './TreatmentScheduler';
import { LayoutGrid } from 'lucide-react';

export default function CustomViewsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <LayoutGrid className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900">Field Views</h2>
        <span className="text-xs text-gray-500">Custom IPM and application analytics</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PesticideHeatmap />
        <IpmEfficacyChart />
        <FieldApplicationReport />
        <TreatmentScheduler />
      </div>
    </div>
  );
}
