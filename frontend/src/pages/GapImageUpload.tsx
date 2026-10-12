import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-image-upload","title":"Image / File Upload","description":"Prepare a professional advisory report for image / file upload using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapImageUpload({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
