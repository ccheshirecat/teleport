import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { PassThrough } from "node:stream";
import { createReadableStreamFromReadable, json } from "@remix-run/node";
import { RemixServer, Outlet, Meta, Links, ScrollRestoration, Scripts, NavLink, useLoaderData, useActionData, useNavigation, Form } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { useState, useEffect } from "react";
import { HomeIcon, CogIcon, ServerIcon, ClockIcon, ChartBarIcon, ExclamationTriangleIcon, PencilIcon, XMarkIcon, CheckIcon, CheckCircleIcon, EyeIcon, ArrowUturnLeftIcon, ArrowPathIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
const ABORT_DELAY = 5e3;
function handleRequest(request, responseStatusCode, responseHeaders, remixContext, loadContext) {
  return isbot(request.headers.get("user-agent") || "") ? handleBotRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  ) : handleBrowserRequest(
    request,
    responseStatusCode,
    responseHeaders,
    remixContext
  );
}
function handleBotRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
function handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      /* @__PURE__ */ jsx(
        RemixServer,
        {
          context: remixContext,
          url: request.url,
          abortDelay: ABORT_DELAY
        }
      ),
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);
          responseHeaders.set("Content-Type", "text/html");
          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode
            })
          );
          pipe(body);
        },
        onShellError(error) {
          reject(error);
        },
        onError(error) {
          responseStatusCode = 500;
          if (shellRendered) {
            console.error(error);
          }
        }
      }
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
const entryServer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: handleRequest
}, Symbol.toStringTag, { value: "Module" }));
const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous"
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
  }
];
function Layout$1({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", className: "h-full", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx("meta", { charSet: "utf-8" }),
      /* @__PURE__ */ jsx("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      /* @__PURE__ */ jsx(Meta, {}),
      /* @__PURE__ */ jsx(Links, {}),
      /* @__PURE__ */ jsx("title", { children: "Teleport - Caddy Controller" })
    ] }),
    /* @__PURE__ */ jsxs("body", { className: "h-full bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900 antialiased", children: [
      children,
      /* @__PURE__ */ jsx(ScrollRestoration, {}),
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function App() {
  return /* @__PURE__ */ jsx(Outlet, {});
}
const route0 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Layout: Layout$1,
  default: App,
  links
}, Symbol.toStringTag, { value: "Module" }));
const navigation = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "Configuration", href: "/configuration", icon: CogIcon },
  { name: "Slaves", href: "/slaves", icon: ServerIcon },
  { name: "History", href: "/history", icon: ClockIcon },
  { name: "Status", href: "/status", icon: ChartBarIcon }
];
function Layout({ children }) {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-glass", children: [
      /* @__PURE__ */ jsx("div", { className: "flex h-16 items-center justify-center border-b border-gray-200/50", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-white font-bold text-sm", children: "T" }) }),
        /* @__PURE__ */ jsx("h1", { className: "text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent", children: "Teleport" })
      ] }) }),
      /* @__PURE__ */ jsx("nav", { className: "mt-8 px-4", children: /* @__PURE__ */ jsx("ul", { className: "space-y-2", children: navigation.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(
        NavLink,
        {
          to: item.href,
          className: ({ isActive }) => clsx(
            "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
            isActive ? "bg-primary-50 text-primary-700 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          ),
          children: ({ isActive }) => /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(
              item.icon,
              {
                className: clsx(
                  "mr-3 h-5 w-5 transition-colors duration-200",
                  isActive ? "text-primary-600" : "text-gray-400 group-hover:text-gray-600"
                )
              }
            ),
            item.name
          ] })
        }
      ) }, item.name)) }) }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-4 left-4 right-4", children: /* @__PURE__ */ jsxs("div", { className: "rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-3 border border-gray-200/50", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 text-center", children: "Teleport Caddy Controller" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-400 text-center mt-1", children: "v1.0.0" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "pl-64", children: /* @__PURE__ */ jsx("main", { className: "min-h-screen", children }) })
  ] });
}
const API_BASE_URL = process.env.TELEPORT_API_URL || "http://localhost:3333";
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
}
const configurationApi = {
  async getActive() {
    try {
      return await apiRequest("/api/v1/configurations/active");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },
  async setActive(config) {
    return apiRequest("/api/v1/configurations/active", {
      method: "POST",
      body: JSON.stringify(config)
    });
  },
  async getHistory() {
    return apiRequest("/api/v1/configurations/history");
  },
  async getByVersionId(versionId) {
    return apiRequest(`/api/v1/configurations/history/${versionId}`);
  },
  async rollback(versionId) {
    return apiRequest(`/api/v1/configurations/rollback/${versionId}`, {
      method: "POST"
    });
  }
};
const slaveApi = {
  async getAll() {
    const result = await apiRequest("/api/v1/slaves");
    return result || [];
  },
  async getById(id) {
    return apiRequest(`/api/v1/slaves/${id}`);
  },
  async create(slave) {
    return apiRequest("/api/v1/slaves", {
      method: "POST",
      body: JSON.stringify(slave)
    });
  },
  async update(id, slave) {
    return apiRequest(`/api/v1/slaves/${id}`, {
      method: "PUT",
      body: JSON.stringify(slave)
    });
  },
  async delete(id) {
    await apiRequest(`/api/v1/slaves/${id}`, {
      method: "DELETE"
    });
  },
  async sync(id) {
    return apiRequest(`/api/v1/slaves/${id}/sync`, {
      method: "POST"
    });
  }
};
const systemApi = {
  async getStatus() {
    return apiRequest("/api/v1/status");
  },
  async healthCheck() {
    return apiRequest("/health");
  }
};
const meta$4 = () => {
  return [
    { title: "Configuration - Teleport" },
    { name: "description", content: "Manage Caddy configuration" }
  ];
};
async function loader$4({ request }) {
  try {
    const activeConfig = await configurationApi.getActive();
    return json({ activeConfig });
  } catch (error) {
    console.error("Configuration loader error:", error);
    return json({
      activeConfig: null,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
async function action$2({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  try {
    switch (intent) {
      case "update": {
        const configData = {
          json_config: formData.get("json_config"),
          description: formData.get("description")
        };
        await configurationApi.setActive(configData);
        return json({ success: true, message: "Configuration updated successfully" });
      }
      default:
        return json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
function Configuration() {
  const { activeConfig, error } = useLoaderData();
  const actionData = useActionData();
  const navigation2 = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [jsonConfig, setJsonConfig] = useState(
    (activeConfig == null ? void 0 : activeConfig.json_config) ? JSON.stringify(JSON.parse(activeConfig.json_config), null, 2) : ""
  );
  const [description, setDescription] = useState("");
  const isSubmitting = navigation2.state === "submitting";
  const handleEdit = () => {
    if (activeConfig) {
      setJsonConfig(JSON.stringify(JSON.parse(activeConfig.json_config), null, 2));
      setDescription("");
    }
    setIsEditing(true);
  };
  const handleCancel = () => {
    setIsEditing(false);
    setJsonConfig((activeConfig == null ? void 0 : activeConfig.json_config) ? JSON.stringify(JSON.parse(activeConfig.json_config), null, 2) : "");
    setDescription("");
  };
  if (error) {
    return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx("div", { className: "p-8", children: /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-error-50 border border-error-200 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsx(ExclamationTriangleIcon, { className: "h-5 w-5 text-error-400" }),
      /* @__PURE__ */ jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-error-800", children: "Failed to load configuration" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-error-700", children: error })
      ] })
    ] }) }) }) });
  }
  return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Configuration Management" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-gray-600", children: "Manage your active Caddy configuration" })
      ] }),
      activeConfig && !isEditing && /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: handleEdit,
          className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200",
          children: [
            /* @__PURE__ */ jsx(PencilIcon, { className: "h-4 w-4 mr-2" }),
            "Edit Configuration"
          ]
        }
      )
    ] }) }),
    actionData && /* @__PURE__ */ jsx("div", { className: clsx(
      "mb-6 rounded-lg border p-4",
      actionData.success ? "bg-success-50 border-success-200 text-success-800" : "bg-error-50 border-error-200 text-error-800"
    ), children: actionData.message }),
    /* @__PURE__ */ jsx("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass", children: activeConfig || isEditing ? /* @__PURE__ */ jsx("div", { className: "p-6", children: !isEditing ? (
      // View Mode
      /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [
            /* @__PURE__ */ jsx(CogIcon, { className: "h-5 w-5 mr-2 text-primary-600" }),
            "Active Configuration"
          ] }),
          /* @__PURE__ */ jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800", children: "Active" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Version ID:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900 font-mono", children: activeConfig.version_id })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Description:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: activeConfig.description })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Created:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: new Date(activeConfig.created_at).toLocaleString() })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500 block mb-2", children: "JSON Configuration:" }),
          /* @__PURE__ */ jsx("pre", { className: "bg-gray-50 rounded-lg p-4 text-sm text-gray-900 overflow-x-auto border", children: JSON.stringify(JSON.parse(activeConfig.json_config), null, 2) })
        ] })
      ] })
    ) : (
      // Edit Mode
      /* @__PURE__ */ jsxs(Form, { method: "post", onSubmit: () => setIsEditing(false), children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "update" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [
              /* @__PURE__ */ jsx(PencilIcon, { className: "h-5 w-5 mr-2 text-primary-600" }),
              "Edit Configuration"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex space-x-3", children: [
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleCancel,
                  className: "inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200",
                  children: [
                    /* @__PURE__ */ jsx(XMarkIcon, { className: "h-4 w-4 mr-2" }),
                    "Cancel"
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "submit",
                  disabled: isSubmitting,
                  className: "inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200 disabled:opacity-50",
                  children: [
                    /* @__PURE__ */ jsx(CheckIcon, { className: "h-4 w-4 mr-2" }),
                    isSubmitting ? "Saving..." : "Save & Apply"
                  ]
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Description" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                name: "description",
                value: description,
                onChange: (e) => setDescription(e.target.value),
                required: true,
                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                placeholder: "Describe this configuration change..."
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "JSON Configuration" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                name: "json_config",
                value: jsonConfig,
                onChange: (e) => setJsonConfig(e.target.value),
                required: true,
                rows: 20,
                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm",
                placeholder: "Enter Caddy JSON configuration..."
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Enter valid Caddy JSON configuration. Changes will be applied to all enabled slaves." })
          ] })
        ] })
      ] })
    ) }) : (
      // No Configuration State
      /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
        /* @__PURE__ */ jsx(CogIcon, { className: "mx-auto h-12 w-12 text-gray-400" }),
        /* @__PURE__ */ jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "No active configuration" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Get started by creating your first Caddy configuration." }),
        /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setIsEditing(true),
            className: "inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
            children: [
              /* @__PURE__ */ jsx(PencilIcon, { className: "h-4 w-4 mr-2" }),
              "Create Configuration"
            ]
          }
        ) })
      ] })
    ) })
  ] }) });
}
const route1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$2,
  default: Configuration,
  loader: loader$4,
  meta: meta$4
}, Symbol.toStringTag, { value: "Module" }));
const meta$3 = () => {
  return [
    { title: "History - Teleport" },
    { name: "description", content: "Configuration version history" }
  ];
};
async function loader$3({ request }) {
  try {
    const history = await configurationApi.getHistory();
    return json({ history });
  } catch (error) {
    console.error("History loader error:", error);
    return json({
      history: [],
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
async function action$1({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  try {
    switch (intent) {
      case "rollback": {
        const versionId = formData.get("version_id");
        await configurationApi.rollback(versionId);
        return json({ success: true, message: `Rolled back to version ${versionId}` });
      }
      default:
        return json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
function History() {
  const { history, error } = useLoaderData();
  const actionData = useActionData();
  const navigation2 = useNavigation();
  const [selectedConfig, setSelectedConfig] = useState(null);
  const isSubmitting = navigation2.state === "submitting";
  if (error) {
    return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx("div", { className: "p-8", children: /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-error-50 border border-error-200 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsx(ExclamationTriangleIcon, { className: "h-5 w-5 text-error-400" }),
      /* @__PURE__ */ jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-error-800", children: "Failed to load configuration history" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-error-700", children: error })
      ] })
    ] }) }) }) });
  }
  return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Configuration History" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-gray-600", children: "View and manage configuration version history" })
    ] }) }),
    actionData && /* @__PURE__ */ jsx("div", { className: clsx(
      "mb-6 rounded-lg border p-4",
      actionData.success ? "bg-success-50 border-success-200 text-success-800" : "bg-error-50 border-error-200 text-error-800"
    ), children: actionData.message }),
    selectedConfig && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "p-6 border-b border-gray-200", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900", children: [
          "Configuration Details - ",
          selectedConfig.version_id
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setSelectedConfig(null),
            className: "text-gray-400 hover:text-gray-600",
            children: [
              /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" }),
              "✕"
            ]
          }
        )
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 overflow-y-auto max-h-[calc(90vh-120px)]", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-4 mb-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Version ID:" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900 font-mono", children: selectedConfig.version_id })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Description:" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: selectedConfig.description })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Created:" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: new Date(selectedConfig.created_at).toLocaleString() })
            ] })
          ] }),
          selectedConfig.is_active && /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800", children: [
            /* @__PURE__ */ jsx(CheckCircleIcon, { className: "h-3 w-3 mr-1" }),
            "Currently Active"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500 block mb-2", children: "JSON Configuration:" }),
          /* @__PURE__ */ jsx("pre", { className: "bg-gray-50 rounded-lg p-4 text-sm text-gray-900 overflow-x-auto border", children: JSON.stringify(JSON.parse(selectedConfig.json_config), null, 2) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "p-6 border-t border-gray-200 flex justify-end space-x-3", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setSelectedConfig(null),
            className: "px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200",
            children: "Close"
          }
        ),
        !selectedConfig.is_active && /* @__PURE__ */ jsxs(Form, { method: "post", className: "inline", children: [
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "rollback" }),
          /* @__PURE__ */ jsx("input", { type: "hidden", name: "version_id", value: selectedConfig.version_id }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              onClick: () => {
                if (confirm(`Are you sure you want to rollback to version ${selectedConfig.version_id}?`)) {
                  setSelectedConfig(null);
                }
              },
              className: "px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200 disabled:opacity-50",
              children: isSubmitting ? "Rolling back..." : "Rollback to this Version"
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass overflow-hidden", children: history.length > 0 ? /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-gray-50/50", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Version" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Description" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Created" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "bg-white/50 divide-y divide-gray-200", children: history.map((config) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-gray-50/50 transition-colors duration-200", children: [
        /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-900 font-mono", children: config.version_id }),
          /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-500", children: [
            config.id.slice(0, 8),
            "..."
          ] })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-6 py-4", children: /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-900 max-w-xs truncate", children: config.description }) }),
        /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [
          /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-900", children: new Date(config.created_at).toLocaleDateString() }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500", children: new Date(config.created_at).toLocaleTimeString() })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: config.is_active ? /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800", children: [
          /* @__PURE__ */ jsx(CheckCircleIcon, { className: "h-3 w-3 mr-1" }),
          "Active"
        ] }) : /* @__PURE__ */ jsx("span", { className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800", children: "Inactive" }) }),
        /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setSelectedConfig(config),
              className: "text-primary-600 hover:text-primary-900",
              title: "View details",
              children: /* @__PURE__ */ jsx(EyeIcon, { className: "h-4 w-4" })
            }
          ),
          !config.is_active && /* @__PURE__ */ jsxs(Form, { method: "post", className: "inline", children: [
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "rollback" }),
            /* @__PURE__ */ jsx("input", { type: "hidden", name: "version_id", value: config.version_id }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "submit",
                disabled: isSubmitting,
                onClick: (e) => {
                  if (!confirm(`Are you sure you want to rollback to version ${config.version_id}?`)) {
                    e.preventDefault();
                  }
                },
                className: "text-warning-600 hover:text-warning-900 disabled:opacity-50 disabled:cursor-not-allowed",
                title: "Rollback to this version",
                children: /* @__PURE__ */ jsx(ArrowUturnLeftIcon, { className: "h-4 w-4" })
              }
            )
          ] })
        ] })
      ] }, config.id)) })
    ] }) }) : /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
      /* @__PURE__ */ jsx(ClockIcon, { className: "mx-auto h-12 w-12 text-gray-400" }),
      /* @__PURE__ */ jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "No configuration history" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Configuration versions will appear here once you start making changes." })
    ] }) })
  ] }) });
}
const route2 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action: action$1,
  default: History,
  loader: loader$3,
  meta: meta$3
}, Symbol.toStringTag, { value: "Module" }));
const meta$2 = () => {
  return [
    { title: "Status - Teleport" },
    { name: "description", content: "System status and health monitoring" }
  ];
};
async function loader$2({ request }) {
  try {
    const [status, slaves] = await Promise.all([
      systemApi.getStatus(),
      slaveApi.getAll()
    ]);
    return json({ status, slaves });
  } catch (error) {
    console.error("Status loader error:", error);
    return json({
      status: null,
      slaves: [],
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
function Status() {
  const { status, slaves, error } = useLoaderData();
  const [lastRefresh, setLastRefresh] = useState(/* @__PURE__ */ new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshData = async () => {
    setIsRefreshing(true);
    window.location.reload();
  };
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(/* @__PURE__ */ new Date());
    }, 3e4);
    return () => clearInterval(interval);
  }, []);
  if (error) {
    return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx("div", { className: "p-8", children: /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-error-50 border border-error-200 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsx(ExclamationTriangleIcon, { className: "h-5 w-5 text-error-400" }),
      /* @__PURE__ */ jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-error-800", children: "Failed to load status data" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-error-700", children: error })
      ] })
    ] }) }) }) });
  }
  const healthySlaves = slaves.filter((slave) => slave.is_enabled && slave.last_sync_status === "success");
  const unhealthySlaves = slaves.filter((slave) => slave.is_enabled && slave.last_sync_status === "error");
  const pendingSlaves = slaves.filter((slave) => slave.is_enabled && ["pending", "syncing"].includes(slave.last_sync_status));
  return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "System Status" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-gray-600", children: "Monitor the health and status of your Caddy fleet" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-500", children: [
          "Last updated: ",
          lastRefresh.toLocaleTimeString()
        ] }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: refreshData,
            disabled: isRefreshing,
            className: clsx(
              "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm",
              "text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
              "transition-colors duration-200",
              isRefreshing && "opacity-50 cursor-not-allowed"
            ),
            children: [
              /* @__PURE__ */ jsx(ArrowPathIcon, { className: clsx("h-4 w-4 mr-2", isRefreshing && "animate-spin") }),
              isRefreshing ? "Refreshing..." : "Refresh"
            ]
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8", children: [
      /* @__PURE__ */ jsx(
        StatusCard,
        {
          title: "Total Slaves",
          value: (status == null ? void 0 : status.total_slaves) || 0,
          icon: ServerIcon,
          color: "primary"
        }
      ),
      /* @__PURE__ */ jsx(
        StatusCard,
        {
          title: "Healthy",
          value: healthySlaves.length,
          icon: CheckCircleIcon,
          color: "success"
        }
      ),
      /* @__PURE__ */ jsx(
        StatusCard,
        {
          title: "Unhealthy",
          value: unhealthySlaves.length,
          icon: ExclamationTriangleIcon,
          color: "error"
        }
      ),
      /* @__PURE__ */ jsx(
        StatusCard,
        {
          title: "Pending",
          value: pendingSlaves.length,
          icon: ClockIcon,
          color: "warning"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6", children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center mb-4", children: [
          /* @__PURE__ */ jsx(ChartBarIcon, { className: "h-5 w-5 mr-2 text-primary-600" }),
          "Fleet Health"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-600", children: "Enabled Slaves" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-gray-900", children: (status == null ? void 0 : status.enabled_slaves) || 0 })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-600", children: "In Sync" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-success-600", children: (status == null ? void 0 : status.slaves_in_sync) || 0 })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-600", children: "With Errors" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-bold text-error-600", children: (status == null ? void 0 : status.slaves_with_errors) || 0 })
          ] }),
          (status == null ? void 0 : status.enabled_slaves) && status.enabled_slaves > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-sm mb-2", children: [
              /* @__PURE__ */ jsx("span", { className: "text-gray-600", children: "Health Score" }),
              /* @__PURE__ */ jsxs("span", { className: "font-medium", children: [
                Math.round((status.slaves_in_sync || 0) / status.enabled_slaves * 100),
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: "bg-success-600 h-2 rounded-full transition-all duration-300",
                style: {
                  width: `${Math.round((status.slaves_in_sync || 0) / status.enabled_slaves * 100)}%`
                }
              }
            ) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6", children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center mb-4", children: [
          /* @__PURE__ */ jsx(CheckCircleIcon, { className: "h-5 w-5 mr-2 text-primary-600" }),
          "Active Configuration"
        ] }),
        (status == null ? void 0 : status.active_configuration) ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Version ID:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900 font-mono", children: status.active_configuration.version_id })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Description:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: status.active_configuration.description })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Created:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: new Date(status.active_configuration.created_at).toLocaleString() })
          ] })
        ] }) : /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm", children: "No active configuration" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass", children: [
      /* @__PURE__ */ jsx("div", { className: "p-6 border-b border-gray-200/50", children: /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [
        /* @__PURE__ */ jsx(ServerIcon, { className: "h-5 w-5 mr-2 text-primary-600" }),
        "Slave Details"
      ] }) }),
      slaves.length > 0 ? /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [
        /* @__PURE__ */ jsx("thead", { className: "bg-gray-50/50", children: /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Slave" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Connection" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Last Sync" }),
          /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Config Version" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { className: "bg-white/50 divide-y divide-gray-200", children: slaves.map((slave) => /* @__PURE__ */ jsxs("tr", { className: "hover:bg-gray-50/50 transition-colors duration-200", children: [
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx("div", { className: clsx(
              "flex-shrink-0 h-3 w-3 rounded-full",
              slave.is_enabled ? "bg-success-400" : "bg-gray-400"
            ) }),
            /* @__PURE__ */ jsxs("div", { className: "ml-3", children: [
              /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-900", children: slave.name }),
              /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-500", children: [
                slave.id.slice(0, 8),
                "..."
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-900", children: [
              slave.wireguard_ip,
              ":",
              slave.caddy_admin_port
            ] }),
            /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500", children: slave.caddy_admin_api_scheme.toUpperCase() })
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsx("span", { className: clsx(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            getStatusColor$2(slave.last_sync_status)
          ), children: slave.last_sync_status }) }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: slave.last_sync_timestamp ? new Date(slave.last_sync_timestamp).toLocaleString() : "Never" }),
          /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono", children: slave.last_known_config_version_id || "None" })
        ] }, slave.id)) })
      ] }) }) : /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
        /* @__PURE__ */ jsx(ServerIcon, { className: "mx-auto h-12 w-12 text-gray-400" }),
        /* @__PURE__ */ jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "No slaves configured" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Add slaves to monitor their status here." })
      ] })
    ] })
  ] }) });
}
function StatusCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    primary: "text-primary-600 bg-primary-50",
    success: "text-success-600 bg-success-50",
    error: "text-error-600 bg-error-50",
    warning: "text-warning-600 bg-warning-50"
  };
  return /* @__PURE__ */ jsx("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
    /* @__PURE__ */ jsx("div", { className: clsx("p-2 rounded-lg", colorClasses[color]), children: /* @__PURE__ */ jsx(Icon, { className: "h-6 w-6" }) }),
    /* @__PURE__ */ jsxs("div", { className: "ml-4", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-600", children: title }),
      /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-gray-900", children: value })
    ] })
  ] }) });
}
function getStatusColor$2(status) {
  switch (status) {
    case "success":
      return "text-success-700 bg-success-100";
    case "error":
      return "text-error-700 bg-error-100";
    case "pending":
      return "text-warning-700 bg-warning-100";
    case "syncing":
      return "text-primary-700 bg-primary-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
}
const route3 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Status,
  loader: loader$2,
  meta: meta$2
}, Symbol.toStringTag, { value: "Module" }));
const meta$1 = () => {
  return [
    { title: "Slaves - Teleport" },
    { name: "description", content: "Manage Caddy slave instances" }
  ];
};
async function loader$1({ request }) {
  try {
    const slaves = await slaveApi.getAll();
    return json({ slaves });
  } catch (error) {
    console.error("Slaves loader error:", error);
    return json({
      slaves: [],
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
async function action({ request }) {
  const formData = await request.formData();
  const intent = formData.get("intent");
  try {
    switch (intent) {
      case "create": {
        const slaveData = {
          name: formData.get("name"),
          wireguard_ip: formData.get("wireguard_ip"),
          caddy_admin_port: parseInt(formData.get("caddy_admin_port")) || 2019,
          caddy_admin_api_scheme: formData.get("caddy_admin_api_scheme") || "http",
          is_enabled: formData.get("is_enabled") === "true"
        };
        await slaveApi.create(slaveData);
        return json({ success: true, message: "Slave created successfully" });
      }
      case "delete": {
        const id = formData.get("id");
        await slaveApi.delete(id);
        return json({ success: true, message: "Slave deleted successfully" });
      }
      case "sync": {
        const id = formData.get("id");
        const result = await slaveApi.sync(id);
        return json({ success: true, message: result.message });
      }
      default:
        return json({ success: false, message: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    return json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
function Slaves() {
  const { slaves, error } = useLoaderData();
  const actionData = useActionData();
  const navigation2 = useNavigation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const isSubmitting = navigation2.state === "submitting";
  if (error) {
    return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx("div", { className: "p-8", children: /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-error-50 border border-error-200 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsx(ExclamationTriangleIcon, { className: "h-5 w-5 text-error-400" }),
      /* @__PURE__ */ jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-error-800", children: "Failed to load slaves" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-error-700", children: error })
      ] })
    ] }) }) }) });
  }
  return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Slave Management" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-gray-600", children: "Manage your Caddy slave instances" })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setShowCreateForm(true),
          className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200",
          children: [
            /* @__PURE__ */ jsx(PlusIcon, { className: "h-4 w-4 mr-2" }),
            "Add Slave"
          ]
        }
      )
    ] }) }),
    actionData && /* @__PURE__ */ jsx("div", { className: clsx(
      "mb-6 rounded-lg border p-4",
      actionData.success ? "bg-success-50 border-success-200 text-success-800" : "bg-error-50 border-error-200 text-error-800"
    ), children: actionData.message }),
    showCreateForm && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl p-6 w-full max-w-md mx-4", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Add New Slave" }),
      /* @__PURE__ */ jsxs(Form, { method: "post", onSubmit: () => setShowCreateForm(false), children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "create" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Name" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                name: "name",
                required: true,
                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                placeholder: "e.g., edge-sgp-01"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "WireGuard IP" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                name: "wireguard_ip",
                required: true,
                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                placeholder: "e.g., 10.0.1.10"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Caddy Admin Port" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "number",
                name: "caddy_admin_port",
                defaultValue: 2019,
                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "API Scheme" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                name: "caddy_admin_api_scheme",
                defaultValue: "http",
                className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
                children: [
                  /* @__PURE__ */ jsx("option", { value: "http", children: "HTTP" }),
                  /* @__PURE__ */ jsx("option", { value: "https", children: "HTTPS" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "checkbox",
                name: "is_enabled",
                value: "true",
                defaultChecked: true,
                className: "h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              }
            ),
            /* @__PURE__ */ jsx("label", { className: "ml-2 block text-sm text-gray-700", children: "Enable slave" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex justify-end space-x-3 mt-6", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setShowCreateForm(false),
              className: "px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200",
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "submit",
              disabled: isSubmitting,
              className: "px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200 disabled:opacity-50",
              children: isSubmitting ? "Creating..." : "Create Slave"
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass overflow-hidden", children: slaves.length > 0 ? /* @__PURE__ */ jsx("div", { className: "overflow-x-auto", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-gray-50/50", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Slave" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Connection" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Last Sync" }),
        /* @__PURE__ */ jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { className: "bg-white/50 divide-y divide-gray-200", children: slaves.map((slave) => /* @__PURE__ */ jsx(SlaveRow, { slave, isSubmitting }, slave.id)) })
    ] }) }) : /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
      /* @__PURE__ */ jsx(ServerIcon, { className: "mx-auto h-12 w-12 text-gray-400" }),
      /* @__PURE__ */ jsx("h3", { className: "mt-2 text-sm font-medium text-gray-900", children: "No slaves" }),
      /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-gray-500", children: "Get started by adding your first Caddy slave instance." }),
      /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: () => setShowCreateForm(true),
          className: "inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          children: [
            /* @__PURE__ */ jsx(PlusIcon, { className: "h-4 w-4 mr-2" }),
            "Add Slave"
          ]
        }
      ) })
    ] }) })
  ] }) });
}
function SlaveRow({ slave, isSubmitting }) {
  return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-gray-50/50 transition-colors duration-200", children: [
    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
      /* @__PURE__ */ jsx("div", { className: clsx(
        "flex-shrink-0 h-3 w-3 rounded-full",
        slave.is_enabled ? "bg-success-400" : "bg-gray-400"
      ) }),
      /* @__PURE__ */ jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsx("div", { className: "text-sm font-medium text-gray-900", children: slave.name }),
        /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-500", children: [
          slave.id.slice(0, 8),
          "..."
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-900", children: [
        slave.wireguard_ip,
        ":",
        slave.caddy_admin_port
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-500", children: slave.caddy_admin_api_scheme.toUpperCase() })
    ] }),
    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: /* @__PURE__ */ jsx("span", { className: clsx(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      getStatusColor$1(slave.last_sync_status)
    ), children: slave.last_sync_status }) }),
    /* @__PURE__ */ jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: slave.last_sync_timestamp ? new Date(slave.last_sync_timestamp).toLocaleString() : "Never" }),
    /* @__PURE__ */ jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2", children: [
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "inline", children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "sync" }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "id", value: slave.id }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: isSubmitting || !slave.is_enabled,
            className: "text-primary-600 hover:text-primary-900 disabled:opacity-50 disabled:cursor-not-allowed",
            title: "Sync configuration",
            children: /* @__PURE__ */ jsx(ArrowPathIcon, { className: "h-4 w-4" })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(Form, { method: "post", className: "inline", onSubmit: (e) => {
        if (!confirm("Are you sure you want to delete this slave?")) {
          e.preventDefault();
        }
      }, children: [
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "intent", value: "delete" }),
        /* @__PURE__ */ jsx("input", { type: "hidden", name: "id", value: slave.id }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: isSubmitting,
            className: "text-error-600 hover:text-error-900 disabled:opacity-50 disabled:cursor-not-allowed",
            title: "Delete slave",
            children: /* @__PURE__ */ jsx(TrashIcon, { className: "h-4 w-4" })
          }
        )
      ] })
    ] })
  ] });
}
function getStatusColor$1(status) {
  switch (status) {
    case "success":
      return "text-success-700 bg-success-100";
    case "error":
      return "text-error-700 bg-error-100";
    case "pending":
      return "text-warning-700 bg-warning-100";
    case "syncing":
      return "text-primary-700 bg-primary-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
}
const route4 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  action,
  default: Slaves,
  loader: loader$1,
  meta: meta$1
}, Symbol.toStringTag, { value: "Module" }));
const meta = () => {
  return [
    { title: "Dashboard - Teleport" },
    { name: "description", content: "Teleport Caddy Controller Dashboard" }
  ];
};
async function loader({ request }) {
  try {
    const [status, slaves, activeConfig] = await Promise.all([
      systemApi.getStatus(),
      slaveApi.getAll(),
      configurationApi.getActive()
    ]);
    return json({ status, slaves, activeConfig });
  } catch (error) {
    console.error("Dashboard loader error:", error);
    return json({
      status: null,
      slaves: [],
      activeConfig: null,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
function Dashboard() {
  const { status, slaves, activeConfig, error } = useLoaderData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshData = async () => {
    setIsRefreshing(true);
    window.location.reload();
  };
  if (error) {
    return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsx("div", { className: "p-8", children: /* @__PURE__ */ jsx("div", { className: "rounded-lg bg-error-50 border border-error-200 p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
      /* @__PURE__ */ jsx(ExclamationTriangleIcon, { className: "h-5 w-5 text-error-400" }),
      /* @__PURE__ */ jsxs("div", { className: "ml-3", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-sm font-medium text-error-800", children: "Failed to load dashboard data" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-sm text-error-700", children: error })
      ] })
    ] }) }) }) });
  }
  return /* @__PURE__ */ jsx(Layout, { children: /* @__PURE__ */ jsxs("div", { className: "p-8", children: [
    /* @__PURE__ */ jsx("div", { className: "mb-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Dashboard" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-gray-600", children: "Overview of your Caddy fleet and configuration status" })
      ] }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          onClick: refreshData,
          disabled: isRefreshing,
          className: clsx(
            "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm",
            "text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
            "transition-colors duration-200",
            isRefreshing && "opacity-50 cursor-not-allowed"
          ),
          children: [
            /* @__PURE__ */ jsx(ClockIcon, { className: "h-4 w-4 mr-2" }),
            isRefreshing ? "Refreshing..." : "Refresh"
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8", children: [
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "Total Slaves",
          value: (status == null ? void 0 : status.total_slaves) || 0,
          icon: ServerIcon,
          color: "primary"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "Enabled Slaves",
          value: (status == null ? void 0 : status.enabled_slaves) || 0,
          icon: CheckCircleIcon,
          color: "success"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "In Sync",
          value: (status == null ? void 0 : status.slaves_in_sync) || 0,
          icon: CheckCircleIcon,
          color: "success"
        }
      ),
      /* @__PURE__ */ jsx(
        StatCard,
        {
          title: "With Errors",
          value: (status == null ? void 0 : status.slaves_with_errors) || 0,
          icon: ExclamationTriangleIcon,
          color: "error"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [
          /* @__PURE__ */ jsx(CogIcon, { className: "h-5 w-5 mr-2 text-primary-600" }),
          "Active Configuration"
        ] }) }),
        activeConfig ? /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Version ID:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900 font-mono", children: activeConfig.version_id })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Description:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: activeConfig.description })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-gray-500", children: "Created:" }),
            /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-900", children: new Date(activeConfig.created_at).toLocaleString() })
          ] })
        ] }) : /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm", children: "No active configuration" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between mb-4", children: /* @__PURE__ */ jsxs("h2", { className: "text-lg font-semibold text-gray-900 flex items-center", children: [
          /* @__PURE__ */ jsx(ServerIcon, { className: "h-5 w-5 mr-2 text-primary-600" }),
          "Slave Status"
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "space-y-3 max-h-64 overflow-y-auto", children: slaves.length > 0 ? slaves.slice(0, 5).map((slave) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-3 rounded-lg bg-gray-50/50", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-900", children: slave.name }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500", children: slave.wireguard_ip })
          ] }),
          /* @__PURE__ */ jsx("span", { className: clsx(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            getStatusColor(slave.last_sync_status)
          ), children: slave.last_sync_status })
        ] }, slave.id)) : /* @__PURE__ */ jsx("p", { className: "text-gray-500 text-sm", children: "No slaves configured" }) })
      ] })
    ] })
  ] }) });
}
function StatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    primary: "text-primary-600 bg-primary-50",
    success: "text-success-600 bg-success-50",
    error: "text-error-600 bg-error-50",
    warning: "text-warning-600 bg-warning-50"
  };
  return /* @__PURE__ */ jsx("div", { className: "bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-glass p-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center", children: [
    /* @__PURE__ */ jsx("div", { className: clsx("p-2 rounded-lg", colorClasses[color]), children: /* @__PURE__ */ jsx(Icon, { className: "h-6 w-6" }) }),
    /* @__PURE__ */ jsxs("div", { className: "ml-4", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-gray-600", children: title }),
      /* @__PURE__ */ jsx("p", { className: "text-2xl font-bold text-gray-900", children: value })
    ] })
  ] }) });
}
function getStatusColor(status) {
  switch (status) {
    case "success":
      return "text-success-700 bg-success-100";
    case "error":
      return "text-error-700 bg-error-100";
    case "pending":
      return "text-warning-700 bg-warning-100";
    case "syncing":
      return "text-primary-700 bg-primary-100";
    default:
      return "text-gray-700 bg-gray-100";
  }
}
const route5 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: Dashboard,
  loader,
  meta
}, Symbol.toStringTag, { value: "Module" }));
const serverManifest = { "entry": { "module": "/assets/entry.client-BaCAIn_P.js", "imports": ["/assets/components-qZBQBQPF.js"], "css": [] }, "routes": { "root": { "id": "root", "parentId": void 0, "path": "", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": false, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/root-P0CUM60T.js", "imports": ["/assets/components-qZBQBQPF.js"], "css": ["/assets/root-C_mRqPFx.css"] }, "routes/configuration": { "id": "routes/configuration", "parentId": "root", "path": "configuration", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/configuration-B9R_-5nK.js", "imports": ["/assets/components-qZBQBQPF.js", "/assets/Layout-Dy0sIyeH.js"], "css": [] }, "routes/history": { "id": "routes/history", "parentId": "root", "path": "history", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/history-CyZnA3oW.js", "imports": ["/assets/components-qZBQBQPF.js", "/assets/Layout-Dy0sIyeH.js", "/assets/CheckCircleIcon-B6_8jjhy.js"], "css": [] }, "routes/status": { "id": "routes/status", "parentId": "root", "path": "status", "index": void 0, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/status-DG0OM43o.js", "imports": ["/assets/components-qZBQBQPF.js", "/assets/Layout-Dy0sIyeH.js", "/assets/ArrowPathIcon-ZyBmY1DV.js", "/assets/CheckCircleIcon-B6_8jjhy.js"], "css": [] }, "routes/slaves": { "id": "routes/slaves", "parentId": "root", "path": "slaves", "index": void 0, "caseSensitive": void 0, "hasAction": true, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/slaves-Dpn5HF5h.js", "imports": ["/assets/components-qZBQBQPF.js", "/assets/Layout-Dy0sIyeH.js", "/assets/ArrowPathIcon-ZyBmY1DV.js"], "css": [] }, "routes/_index": { "id": "routes/_index", "parentId": "root", "path": void 0, "index": true, "caseSensitive": void 0, "hasAction": false, "hasLoader": true, "hasClientAction": false, "hasClientLoader": false, "hasErrorBoundary": false, "module": "/assets/_index-ARL4w_Os.js", "imports": ["/assets/components-qZBQBQPF.js", "/assets/Layout-Dy0sIyeH.js", "/assets/CheckCircleIcon-B6_8jjhy.js"], "css": [] } }, "url": "/assets/manifest-96f25382.js", "version": "96f25382" };
const mode = "production";
const assetsBuildDirectory = "build/client";
const basename = "/";
const future = { "v3_fetcherPersist": true, "v3_relativeSplatPath": true, "v3_throwAbortReason": true, "v3_routeConfig": false, "v3_singleFetch": true, "v3_lazyRouteDiscovery": true, "unstable_optimizeDeps": false };
const isSpaMode = false;
const publicPath = "/";
const entry = { module: entryServer };
const routes = {
  "root": {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: route0
  },
  "routes/configuration": {
    id: "routes/configuration",
    parentId: "root",
    path: "configuration",
    index: void 0,
    caseSensitive: void 0,
    module: route1
  },
  "routes/history": {
    id: "routes/history",
    parentId: "root",
    path: "history",
    index: void 0,
    caseSensitive: void 0,
    module: route2
  },
  "routes/status": {
    id: "routes/status",
    parentId: "root",
    path: "status",
    index: void 0,
    caseSensitive: void 0,
    module: route3
  },
  "routes/slaves": {
    id: "routes/slaves",
    parentId: "root",
    path: "slaves",
    index: void 0,
    caseSensitive: void 0,
    module: route4
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: true,
    caseSensitive: void 0,
    module: route5
  }
};
export {
  serverManifest as assets,
  assetsBuildDirectory,
  basename,
  entry,
  future,
  isSpaMode,
  mode,
  publicPath,
  routes
};
