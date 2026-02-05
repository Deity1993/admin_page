
export enum ServiceStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  ERROR = 'error',
  PAUSED = 'paused'
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: ServiceStatus;
  uptime: string;
  port: number;
}

export interface AsteriskUser {
  username: string;
  status: 'Online' | 'Offline';
  ip: string;
  lastUsed: string;
}

export interface ServerStats {
  cpu: number;
  memory: number;
  disk: number;
  temp: number;
}
