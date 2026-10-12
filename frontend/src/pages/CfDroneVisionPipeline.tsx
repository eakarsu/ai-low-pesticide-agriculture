import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"cf-drone-vision-pipeline","title":"Drone+Satellite Vision Pipeline","description":"Prepare a professional advisory report for drone+satellite vision pipeline using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function CfDroneVisionPipeline({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
