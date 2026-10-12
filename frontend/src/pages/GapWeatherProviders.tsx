import AIWorkspace from "../components/AIWorkspace";
const feature = {"id":"gap-nonai-weather-providers","title":"Third-Party Weather Providers","description":"Prepare a professional advisory report for third-party weather providers using the brief and evidence you provide. Review the findings, assumptions, and action plan before applying changes.","samples":[]};
export default function GapWeatherProviders({ token } : { token?: string } = {}) { return <AIWorkspace feature={feature} token={token} />; }
