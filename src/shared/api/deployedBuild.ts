import { APP_COMMIT, APP_VERSION } from '@/shared/lib/appVersion';
import { reportNewBuild } from './updateGate';

export const BUILD_INFO_FILE = 'version.json';

export interface BuildInfo {
  version: string;
  commit: string;
}

export const toBuildId = ({ version, commit }: BuildInfo) => `${version}+${commit}`;

export const RUNNING_BUILD_ID = toBuildId({ version: APP_VERSION, commit: APP_COMMIT });

const isBuildInfo = (value: unknown): value is BuildInfo => typeof value === 'object' && value !== null
  && typeof (value as BuildInfo).version === 'string' && typeof (value as BuildInfo).commit === 'string';

export const fetchDeployedBuild = async (): Promise<BuildInfo | null> => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${BUILD_INFO_FILE}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return isBuildInfo(body) ? body : null;
  } catch {
    return null;
  }
};

export const checkForNewBuild = async () => {
  const deployed = await fetchDeployedBuild();
  if (!deployed) return;
  const deployedId = toBuildId(deployed);
  if (deployedId !== RUNNING_BUILD_ID) reportNewBuild(deployedId);
};
