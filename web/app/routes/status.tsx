import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState, useEffect } from "react";
import Layout from "~/components/Layout";
import { systemApi, slaveApi, type SystemStatus, type Slave } from "~/lib/api";
import { 
  ChartBarIcon, 
  ServerIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon 
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export const meta: MetaFunction = () => {
  return [
    { title: "Status - Teleport" },
    { name: "description", content: "System status and health monitoring" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const [status, slaves] = await Promise.all([
      systemApi.getStatus(),
      slaveApi.getAll(),
    ]);

    return json({ status, slaves });
  } catch (error) {
    console.error('Status loader error:', error);
    return json({ 
      status: null, 
      slaves: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default function Status() {
  const { status, slaves, error } = useLoaderData<typeof loader>();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    // Trigger a page refresh to reload data
    window.location.reload();
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
      // You could implement a more sophisticated refresh here
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="rounded-lg bg-error-50 border border-error-200 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800">
                  Failed to load status data
                </h3>
                <p className="mt-1 text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const healthySlaves = slaves.filter(slave => slave.is_enabled && slave.last_sync_status === 'success');
  const unhealthySlaves = slaves.filter(slave => slave.is_enabled && slave.last_sync_status === 'error');
  const pendingSlaves = slaves.filter(slave => slave.is_enabled && ['pending', 'syncing'].includes(slave.last_sync_status));

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Status</h1>
              <p className="mt-2 text-gray-600">
                Monitor the health and status of your Caddy fleet
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className={clsx(
                  "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm",
                  "text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
                  "transition-colors duration-200",
                  isRefreshing && "opacity-50 cursor-not-allowed"
                )}
              >
                <ArrowPathIcon className={clsx("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatusCard
            title="Total Slaves"
            value={status?.total_slaves || 0}
            icon={ServerIcon}
            color="primary"
          />
          <StatusCard
            title="Healthy"
            value={healthySlaves.length}
            icon={CheckCircleIcon}
            color="success"
          />
          <StatusCard
            title="Unhealthy"
            value={unhealthySlaves.length}
            icon={ExclamationTriangleIcon}
            color="error"
          />
          <StatusCard
            title="Pending"
            value={pendingSlaves.length}
            icon={ClockIcon}
            color="warning"
          />
        </div>

        {/* System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Health Overview */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              <ChartBarIcon className="h-5 w-5 mr-2 text-primary-600" />
              Fleet Health
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Enabled Slaves</span>
                <span className="text-sm font-bold text-gray-900">{status?.enabled_slaves || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">In Sync</span>
                <span className="text-sm font-bold text-success-600">{status?.slaves_in_sync || 0}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">With Errors</span>
                <span className="text-sm font-bold text-error-600">{status?.slaves_with_errors || 0}</span>
              </div>
              
              {status?.enabled_slaves && status.enabled_slaves > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Health Score</span>
                    <span className="font-medium">
                      {Math.round(((status.slaves_in_sync || 0) / status.enabled_slaves) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-success-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.round(((status.slaves_in_sync || 0) / status.enabled_slaves) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Configuration */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
              <CheckCircleIcon className="h-5 w-5 mr-2 text-primary-600" />
              Active Configuration
            </h2>
            
            {status?.active_configuration ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Version ID:</span>
                  <p className="text-sm text-gray-900 font-mono">{status.active_configuration.version_id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="text-sm text-gray-900">{status.active_configuration.description}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created:</span>
                  <p className="text-sm text-gray-900">
                    {new Date(status.active_configuration.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active configuration</p>
            )}
          </div>
        </div>

        {/* Detailed Slave Status */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass">
          <div className="p-6 border-b border-gray-200/50">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ServerIcon className="h-5 w-5 mr-2 text-primary-600" />
              Slave Details
            </h2>
          </div>
          
          {slaves.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slave
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Connection
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Sync
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Config Version
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {slaves.map((slave) => (
                    <tr key={slave.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={clsx(
                            "flex-shrink-0 h-3 w-3 rounded-full",
                            slave.is_enabled ? "bg-success-400" : "bg-gray-400"
                          )} />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{slave.name}</div>
                            <div className="text-sm text-gray-500">{slave.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{slave.wireguard_ip}:{slave.caddy_admin_port}</div>
                        <div className="text-sm text-gray-500">{slave.caddy_admin_api_scheme.toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                          getStatusColor(slave.last_sync_status)
                        )}>
                          {slave.last_sync_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {slave.last_sync_timestamp 
                          ? new Date(slave.last_sync_timestamp).toLocaleString()
                          : "Never"
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {slave.last_known_config_version_id || "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No slaves configured</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add slaves to monitor their status here.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

interface StatusCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'primary' | 'success' | 'error' | 'warning';
}

function StatusCard({ title, value, icon: Icon, color }: StatusCardProps) {
  const colorClasses = {
    primary: 'text-primary-600 bg-primary-50',
    success: 'text-success-600 bg-success-50',
    error: 'text-error-600 bg-error-50',
    warning: 'text-warning-600 bg-warning-50',
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6">
      <div className="flex items-center">
        <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'text-success-700 bg-success-100';
    case 'error':
      return 'text-error-700 bg-error-100';
    case 'pending':
      return 'text-warning-700 bg-warning-100';
    case 'syncing':
      return 'text-primary-700 bg-primary-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
}
