import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"cf-coop-heatmaps","title":"Cooperative Pest-Pressure Heatmaps","description":"Prepare a professional advisory report for cooperative pest-pressure heatmaps using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function CfCoopHeatmaps({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
