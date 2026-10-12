import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-notifications","title":"Notifications & Alerts","description":"Prepare a professional advisory report for notifications & alerts using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapNotifications({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
