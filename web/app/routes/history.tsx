import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import Layout from "~/components/Layout";
import { configurationApi, type Configuration } from "~/lib/api";
import {
  ClockIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export const meta: MetaFunction = () => {
  return [
    { title: "History - Teleport" },
    { name: "description", content: "Configuration version history" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const history = await configurationApi.getHistory();
    return json({ history });
  } catch (error) {
    console.error('History loader error:', error);
    return json({
      history: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "rollback": {
        const versionId = formData.get("version_id") as string;
        await configurationApi.rollback(versionId);
        return json({ success: true, message: `Rolled back to version ${versionId}` });
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

export default function History() {
  const { history, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);

  const isSubmitting = navigation.state === "submitting";

  // Ensure history is always an array
  const safeHistory = history || [];

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="rounded-lg bg-error-50 border border-error-200 p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-error-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-error-800">
                  Failed to load configuration history
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuration History</h1>
            <p className="mt-2 text-gray-600">
              View and manage configuration version history
            </p>
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

        {/* Configuration Detail Modal */}
        {selectedConfig && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Configuration Details - {selectedConfig.version_id}
                  </h3>
                  <button
                    onClick={() => setSelectedConfig(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Version ID:</span>
                      <p className="text-sm text-gray-900 font-mono">{selectedConfig.version_id}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Description:</span>
                      <p className="text-sm text-gray-900">{selectedConfig.description}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500">Created:</span>
                      <p className="text-sm text-gray-900">
                        {new Date(selectedConfig.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {selectedConfig.is_active && (
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Currently Active
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-sm font-medium text-gray-500 block mb-2">JSON Configuration:</span>
                  <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900 overflow-x-auto border">
                    {JSON.stringify(JSON.parse(selectedConfig.json_config), null, 2)}
                  </pre>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedConfig(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
                {!selectedConfig.is_active && (
                  <Form method="post" className="inline">
                    <input type="hidden" name="intent" value="rollback" />
                    <input type="hidden" name="version_id" value={selectedConfig.version_id} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      onClick={() => {
                        if (confirm(`Are you sure you want to rollback to version ${selectedConfig.version_id}?`)) {
                          setSelectedConfig(null);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200 disabled:opacity-50"
                    >
                      {isSubmitting ? "Rolling back..." : "Rollback to this Version"}
                    </button>
                  </Form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass overflow-hidden">
          {safeHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Version
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200">
                  {safeHistory.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50/50 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {config.version_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {config.id.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {config.description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(config.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(config.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {config.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedConfig(config)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>

                        {!config.is_active && (
                          <Form method="post" className="inline">
                            <input type="hidden" name="intent" value="rollback" />
                            <input type="hidden" name="version_id" value={config.version_id} />
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              onClick={(e) => {
                                if (!confirm(`Are you sure you want to rollback to version ${config.version_id}?`)) {
                                  e.preventDefault();
                                }
                              }}
                              className="text-warning-600 hover:text-warning-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Rollback to this version"
                            >
                              <ArrowUturnLeftIcon className="h-4 w-4" />
                            </button>
                          </Form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No configuration history</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configuration versions will appear here once you start making changes.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
