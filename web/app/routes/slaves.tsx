import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import Layout from "~/components/Layout";
import { slaveApi, type Slave } from "~/lib/api";
import { 
  ServerIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon 
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export const meta: MetaFunction = () => {
  return [
    { title: "Slaves - Teleport" },
    { name: "description", content: "Manage Caddy slave instances" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const slaves = await slaveApi.getAll();
    return json({ slaves });
  } catch (error) {
    console.error('Slaves loader error:', error);
    return json({ 
      slaves: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "create": {
        const slaveData = {
          name: formData.get("name") as string,
          wireguard_ip: formData.get("wireguard_ip") as string,
          caddy_admin_port: parseInt(formData.get("caddy_admin_port") as string) || 2019,
          caddy_admin_api_scheme: formData.get("caddy_admin_api_scheme") as string || "http",
          is_enabled: formData.get("is_enabled") === "true",
        };
        
        await slaveApi.create(slaveData);
        return json({ success: true, message: "Slave created successfully" });
      }
      
      case "delete": {
        const id = formData.get("id") as string;
        await slaveApi.delete(id);
        return json({ success: true, message: "Slave deleted successfully" });
      }
      
      case "sync": {
        const id = formData.get("id") as string;
        const result = await slaveApi.sync(id);
        return json({ success: true, message: result.message });
      }
      
      default:
        return json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

export default function Slaves() {
  const { slaves, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="rounded-lg bg-error-50 border border-error-200 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800">
                  Failed to load slaves
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Slave Management</h1>
              <p className="mt-2 text-gray-600">
                Manage your Caddy slave instances
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Slave
            </button>
          </div>
        </div>

        {/* Action feedback */}
        {actionData && (
          <div className={clsx(
            "mb-6 rounded-lg border p-4",
            actionData.success 
              ? "bg-success-50 border-success-200 text-success-800"
              : "bg-error-50 border-error-200 text-error-800"
          )}>
            {actionData.message}
          </div>
        )}

        {/* Create Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Slave</h3>
              <Form method="post" onSubmit={() => setShowCreateForm(false)}>
                <input type="hidden" name="intent" value="create" />
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., edge-sgp-01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WireGuard IP
                    </label>
                    <input
                      type="text"
                      name="wireguard_ip"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="e.g., 10.0.1.10"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Caddy Admin Port
                    </label>
                    <input
                      type="number"
                      name="caddy_admin_port"
                      defaultValue={2019}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Scheme
                    </label>
                    <select
                      name="caddy_admin_api_scheme"
                      defaultValue="http"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_enabled"
                      value="true"
                      defaultChecked
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700">
                      Enable slave
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                  >
                    {isSubmitting ? "Creating..." : "Create Slave"}
                  </button>
                </div>
              </Form>
            </div>
          </div>
        )}

        {/* Slaves List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass overflow-hidden">
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {slaves.map((slave) => (
                    <SlaveRow key={slave.id} slave={slave} isSubmitting={isSubmitting} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ServerIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No slaves</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first Caddy slave instance.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Slave
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

interface SlaveRowProps {
  slave: Slave;
  isSubmitting: boolean;
}

function SlaveRow({ slave, isSubmitting }: SlaveRowProps) {
  return (
    <tr className="hover:bg-gray-50/50 transition-colors duration-200">
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
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
        <Form method="post" className="inline">
          <input type="hidden" name="intent" value="sync" />
          <input type="hidden" name="id" value={slave.id} />
          <button
            type="submit"
            disabled={isSubmitting || !slave.is_enabled}
            className="text-primary-600 hover:text-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sync configuration"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </Form>
        
        <Form method="post" className="inline" onSubmit={(e) => {
          if (!confirm('Are you sure you want to delete this slave?')) {
            e.preventDefault();
          }
        }}>
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={slave.id} />
          <button
            type="submit"
            disabled={isSubmitting}
            className="text-error-600 hover:text-error-900 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete slave"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </Form>
      </td>
    </tr>
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
