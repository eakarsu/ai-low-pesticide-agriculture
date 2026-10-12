import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-multi-tenant-farms","title":"Multi-Tenant Farm Separation","description":"Prepare a professional advisory report for multi-tenant farm separation using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapMultiTenantFarms({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
