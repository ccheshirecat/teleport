import { NavLink } from "@remix-run/react";
import { 
  HomeIcon, 
  CogIcon, 
  ServerIcon, 
  ClockIcon,
  ChartBarIcon 
} from "@heroicons/react/24/outline";
import clsx from "clsx";

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: HomeIcon },
  { name: "Configuration", href: "/configuration", icon: CogIcon },
  { name: "Slaves", href: "/slaves", icon: ServerIcon },
  { name: "History", href: "/history", icon: ClockIcon },
  { name: "Status", href: "/status", icon: ChartBarIcon },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-full">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 shadow-glass">
        <div className="flex h-16 items-center justify-center border-b border-gray-200/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              Teleport
            </h1>
          </div>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    clsx(
                      "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary-50 text-primary-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={clsx(
                          "mr-3 h-5 w-5 transition-colors duration-200",
                          isActive
                            ? "text-primary-600"
                            : "text-gray-400 group-hover:text-gray-600"
                        )}
                      />
                      {item.name}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 p-3 border border-gray-200/50">
            <p className="text-xs text-gray-500 text-center">
              Teleport Caddy Controller
            </p>
            <p className="text-xs text-gray-400 text-center mt-1">
              v1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
