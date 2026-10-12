import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-offline-sync","title":"Mobile / Offline Sync","description":"Prepare a professional advisory report for mobile / offline sync using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapOfflineSync({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
