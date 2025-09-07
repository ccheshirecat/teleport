import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import Layout from "~/components/Layout";
import { systemApi, slaveApi, configurationApi } from "~/lib/api";
import {
  ServerIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard - Teleport" },
    { name: "description", content: "Teleport Caddy Controller Dashboard" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const [status, slaves, activeConfig] = await Promise.all([
      systemApi.getStatus(),
      slaveApi.getAll(),
      configurationApi.getActive(),
    ]);

    return json({ status, slaves, activeConfig });
  } catch (error) {
    console.error('Dashboard loader error:', error);
    return json({
      status: null,
      slaves: [],
      activeConfig: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default function Dashboard() {
  const { status, slaves, activeConfig, error } = useLoaderData<typeof loader>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshData = async () => {
    setIsRefreshing(true);
    window.location.reload();
  };

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="rounded-lg bg-error-50 border border-error-200 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800">
                  Failed to load dashboard data
                </h3>
                <p className="mt-1 text-sm text-error-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Overview of your Caddy fleet and configuration status
              </p>
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
              <ClockIcon className="h-4 w-4 mr-2" />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Slaves"
            value={status?.total_slaves || 0}
            icon={ServerIcon}
            color="primary"
          />
          <StatCard
            title="Enabled Slaves"
            value={status?.enabled_slaves || 0}
            icon={CheckCircleIcon}
            color="success"
          />
          <StatCard
            title="In Sync"
            value={status?.slaves_in_sync || 0}
            icon={CheckCircleIcon}
            color="success"
          />
          <StatCard
            title="With Errors"
            value={status?.slaves_with_errors || 0}
            icon={ExclamationTriangleIcon}
            color="error"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <CogIcon className="h-5 w-5 mr-2 text-primary-600" />
                Active Configuration
              </h2>
            </div>

            {activeConfig ? (
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Version ID:</span>
                  <p className="text-sm text-gray-900 font-mono">{activeConfig.version_id}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="text-sm text-gray-900">{activeConfig.description}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Created:</span>
                  <p className="text-sm text-gray-900">
                    {new Date(activeConfig.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active configuration</p>
            )}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <ServerIcon className="h-5 w-5 mr-2 text-primary-600" />
                Slave Status
              </h2>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {slaves.length > 0 ? (
                slaves.slice(0, 5).map((slave) => (
                  <div key={slave.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{slave.name}</p>
                      <p className="text-xs text-gray-500">{slave.wireguard_ip}</p>
                    </div>
                    <span className={clsx(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      getStatusColor(slave.last_sync_status)
                    )}>
                      {slave.last_sync_status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No slaves configured</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'primary' | 'success' | 'error' | 'warning';
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
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
