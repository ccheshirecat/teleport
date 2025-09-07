// API client for Teleport backend

const API_BASE_URL = process.env.TELEPORT_API_URL || 'http://localhost:3333';

export interface Configuration {
  id: string;
  version_id: string;
  json_config: string;
  description: string;
  created_at: string;
  is_active: boolean;
}

export interface Slave {
  id: string;
  name: string;
  wireguard_ip: string;
  caddy_admin_port: number;
  caddy_admin_api_scheme: string;
  is_enabled: boolean;
  last_known_config_version_id: string | null;
  last_sync_status: string;
  last_sync_message: string;
  last_sync_timestamp: string | null;
  added_at: string;
}

export interface SystemStatus {
  active_configuration: Configuration | null;
  total_slaves: number;
  enabled_slaves: number;
  slaves_in_sync: number;
  slaves_with_errors: number;
}

export interface ConfigurationRequest {
  json_config: string;
  description: string;
}

export interface SlaveRequest {
  name: string;
  wireguard_ip: string;
  caddy_admin_port?: number;
  caddy_admin_api_scheme?: string;
  is_enabled?: boolean;
}

export interface SyncResult {
  slave_id: string;
  success: boolean;
  message: string;
  timestamp: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Configuration API
export const configurationApi = {
  async getActive(): Promise<Configuration | null> {
    try {
      return await apiRequest<Configuration>('/api/v1/configurations/active');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  async setActive(config: ConfigurationRequest): Promise<Configuration> {
    return apiRequest<Configuration>('/api/v1/configurations/active', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  async getHistory(): Promise<Configuration[]> {
    return apiRequest<Configuration[]>('/api/v1/configurations/history');
  },

  async getByVersionId(versionId: string): Promise<Configuration> {
    return apiRequest<Configuration>(`/api/v1/configurations/history/${versionId}`);
  },

  async rollback(versionId: string): Promise<Configuration> {
    return apiRequest<Configuration>(`/api/v1/configurations/rollback/${versionId}`, {
      method: 'POST',
    });
  },
};

// Slave API
export const slaveApi = {
  async getAll(): Promise<Slave[]> {
    const result = await apiRequest<Slave[] | null>('/api/v1/slaves');
    return result || [];
  },

  async getById(id: string): Promise<Slave> {
    return apiRequest<Slave>(`/api/v1/slaves/${id}`);
  },

  async create(slave: SlaveRequest): Promise<Slave> {
    return apiRequest<Slave>('/api/v1/slaves', {
      method: 'POST',
      body: JSON.stringify(slave),
    });
  },

  async update(id: string, slave: SlaveRequest): Promise<Slave> {
    return apiRequest<Slave>(`/api/v1/slaves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(slave),
    });
  },

  async delete(id: string): Promise<void> {
    await apiRequest<{ message: string }>(`/api/v1/slaves/${id}`, {
      method: 'DELETE',
    });
  },

  async sync(id: string): Promise<{ message: string; result: SyncResult }> {
    return apiRequest<{ message: string; result: SyncResult }>(`/api/v1/slaves/${id}/sync`, {
      method: 'POST',
    });
  },
};

// System API
export const systemApi = {
  async getStatus(): Promise<SystemStatus> {
    return apiRequest<SystemStatus>('/api/v1/status');
  },

  async healthCheck(): Promise<{ status: string }> {
    return apiRequest<{ status: string }>('/health');
  },
};

// Utility functions
export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'text-success-600 bg-success-50';
    case 'error':
      return 'text-error-600 bg-error-50';
    case 'pending':
      return 'text-warning-600 bg-warning-50';
    case 'syncing':
      return 'text-primary-600 bg-primary-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'pending':
      return '⏳';
    case 'syncing':
      return '🔄';
    default:
      return '?';
  }
}
