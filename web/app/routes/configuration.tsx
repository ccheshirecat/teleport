import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useActionData, Form, useNavigation } from "@remix-run/react";
import { useState } from "react";
import Layout from "~/components/Layout";
import { configurationApi, type Configuration } from "~/lib/api";
import {
  ArrowPathIcon,
  CogIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export const meta: MetaFunction = () => {
  return [
    { title: "Configuration - Teleport" },
    { name: "description", content: "Manage Caddy configuration" },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const activeConfig = await configurationApi.getActive();
    return json({ activeConfig });
  } catch (error) {
    console.error('Configuration loader error:', error);
    return json({
      activeConfig: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "update": {
        const configData = {
          json_config: formData.get("json_config") as string,
          description: formData.get("description") as string,
        };

        await configurationApi.setActive(configData);
        return json({ success: true, message: "Configuration updated successfully" });
      }

      case "sync": {
        // Trigger sync of current active configuration to all slaves
        const response = await fetch(`${process.env.TELEPORT_API_URL || 'http://localhost:3333'}/api/v1/configurations/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        return json({ success: true, message: result.message || "Configuration synced to all slaves" });
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

export default function Configuration() {
  const { activeConfig, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [jsonConfig, setJsonConfig] = useState(() => {
    if (!activeConfig?.json_config) return "";
    try {
      return JSON.stringify(JSON.parse(activeConfig.json_config), null, 2);
    } catch (e) {
      console.error("Invalid JSON in activeConfig:", activeConfig.json_config);
      return activeConfig.json_config; // Return raw string if JSON is invalid
    }
  });
  const [description, setDescription] = useState("");

  const isSubmitting = navigation.state === "submitting";

  const handleEdit = () => {
    if (activeConfig) {
      try {
        setJsonConfig(JSON.stringify(JSON.parse(activeConfig.json_config), null, 2));
      } catch (e) {
        console.error("Invalid JSON in activeConfig:", activeConfig.json_config);
        setJsonConfig(activeConfig.json_config); // Use raw string if JSON is invalid
      }
      setDescription("");
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (activeConfig?.json_config) {
      try {
        setJsonConfig(JSON.stringify(JSON.parse(activeConfig.json_config), null, 2));
      } catch (e) {
        console.error("Invalid JSON in activeConfig:", activeConfig.json_config);
        setJsonConfig(activeConfig.json_config);
      }
    } else {
      setJsonConfig("");
    }
    setDescription("");
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
                  Failed to load configuration
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
              <h1 className="text-3xl font-bold text-gray-900">Configuration Management</h1>
              <p className="mt-2 text-gray-600">
                Manage your active Caddy configuration
              </p>
            </div>
            {activeConfig && !isEditing && (
              <div className="flex space-x-3">
                <Form method="post">
                  <input type="hidden" name="intent" value="sync" />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    {isSubmitting && navigation.formData?.get("intent") === "sync" ? "Syncing..." : "Sync to All Slaves"}
                  </button>
                </Form>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Edit Configuration
                </button>
              </div>
            )}
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

        {/* Configuration Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass">
          {activeConfig || isEditing ? (
            <div className="p-6">
              {!isEditing ? (
                // View Mode
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                      <CogIcon className="h-5 w-5 mr-2 text-primary-600" />
                      Active Configuration
                    </h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                      Active
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <div>
                    <span className="text-sm font-medium text-gray-500 block mb-2">JSON Configuration:</span>
                    <pre className="bg-gray-50 rounded-lg p-4 text-sm text-gray-900 overflow-x-auto border">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(activeConfig.json_config), null, 2);
                        } catch (e) {
                          return activeConfig.json_config; // Show raw content if invalid JSON
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              ) : (
                // Edit Mode
                <Form method="post" onSubmit={() => setIsEditing(false)}>
                  <input type="hidden" name="intent" value="update" />

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <PencilIcon className="h-5 w-5 mr-2 text-primary-600" />
                        Edit Configuration
                      </h2>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                        >
                          <XMarkIcon className="h-4 w-4 mr-2" />
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50"
                        >
                          <CheckIcon className="h-4 w-4 mr-2" />
                          {isSubmitting ? "Saving..." : "Save & Apply"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Describe this configuration change..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        JSON Configuration
                      </label>
                      <textarea
                        name="json_config"
                        value={jsonConfig}
                        onChange={(e) => setJsonConfig(e.target.value)}
                        required
                        rows={20}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
                        placeholder="Enter Caddy JSON configuration..."
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Enter valid Caddy JSON configuration. Changes will be applied to all enabled slaves.
                      </p>
                    </div>
                  </div>
                </Form>
              )}
            </div>
          ) : (
            // No Configuration State
            <div className="text-center py-12">
              <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No active configuration</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first Caddy configuration.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <PencilIcon className="h-4 w-4 mr-2" />
                  Create Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
