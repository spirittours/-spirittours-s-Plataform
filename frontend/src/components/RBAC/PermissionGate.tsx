/**
 * Permission Gate Components
 * Control component rendering based on user permissions
 */

import React, { ReactNode } from 'react';
import { usePermissions } from '../../store/rbacStore';

interface PermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SpecificPermissionProps extends PermissionGateProps {
  permission: string;
}

interface AgentPermissionProps extends PermissionGateProps {
  agentScope: string;
  requireExecute?: boolean;
}

interface DashboardPermissionProps extends PermissionGateProps {
  section: 'analytics' | 'financial_reports' | 'booking_management' | 'customer_database' | 
           'marketing_campaigns' | 'user_management' | 'system_configuration' | 'audit_logs';
}

interface AdminOnlyProps extends PermissionGateProps {}

/**
 * Generic Permission Gate
 * Show/hide content based on specific permission string
 */
export const PermissionGate: React.FC<SpecificPermissionProps> = ({
  children,
  permission,
  fallback = null,
}) => {
  const { hasPermission } = usePermissions();

  if (hasPermission(permission)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Agent Access Gate
 * Control access to AI agent features
 */
export const AgentGate: React.FC<AgentPermissionProps> = ({
  children,
  agentScope,
  requireExecute = false,
  fallback = null,
}) => {
  const { canAccessAgent, canExecuteAgent } = usePermissions();

  const hasAccess = requireExecute 
    ? canExecuteAgent(agentScope)
    : canAccessAgent(agentScope);

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Dashboard Section Gate
 * Control access to dashboard sections
 */
export const DashboardGate: React.FC<DashboardPermissionProps> = ({
  children,
  section,
  fallback = null,
}) => {
  const { canAccessDashboardSection } = usePermissions();

  if (canAccessDashboardSection(section)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Admin Only Gate
 * Show content only to administrators
 */
export const AdminGate: React.FC<AdminOnlyProps> = ({
  children,
  fallback = null,
}) => {
  const { isAdmin } = usePermissions();

  if (isAdmin) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Multiple Permission Gate
 * Requires ALL specified permissions (AND logic)
 */
export const AllPermissionsGate: React.FC<{
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ permissions, children, fallback = null }) => {
  const { hasPermission } = usePermissions();

  const hasAllPermissions = permissions.every(permission => hasPermission(permission));

  if (hasAllPermissions) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Any Permission Gate
 * Requires ANY of the specified permissions (OR logic)
 */
export const AnyPermissionGate: React.FC<{
  permissions: string[];
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ permissions, children, fallback = null }) => {
  const { hasPermission } = usePermissions();

  const hasAnyPermission = permissions.some(permission => hasPermission(permission));

  if (hasAnyPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * Role Level Gate
 * Show content based on minimum role hierarchy level
 */
export const RoleLevelGate: React.FC<{
  minLevel: number;
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ minLevel, children, fallback = null }) => {
  const { isAdmin, userPermissions } = usePermissions();

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>;
  }

  // This would require role level information from the backend
  // For now, we'll use admin check as a simple implementation
  // In a full implementation, you'd need to pass role hierarchy levels
  
  return <>{fallback}</>;
};

/**
 * Conditional Permission Message
 * Show different messages based on permissions
 */
export const PermissionMessage: React.FC<{
  permission?: string;
  agentScope?: string;
  isAdmin?: boolean;
  hasPermissionMessage: string | ReactNode;
  noPermissionMessage: string | ReactNode;
  className?: string;
}> = ({
  permission,
  agentScope,
  isAdmin: requireAdmin = false,
  hasPermissionMessage,
  noPermissionMessage,
  className = "",
}) => {
  const { hasPermission, canAccessAgent, isAdmin } = usePermissions();

  let hasAccess = false;

  if (requireAdmin) {
    hasAccess = isAdmin;
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (agentScope) {
    hasAccess = canAccessAgent(agentScope);
  }

  return (
    <div className={className}>
      {hasAccess ? hasPermissionMessage : noPermissionMessage}
    </div>
  );
};

/**
 * Permission Button
 * Button that's only enabled if user has permission
 */
export const PermissionButton: React.FC<{
  permission?: string;
  agentScope?: string;
  requireAdmin?: boolean;
  onClick: () => void;
  children: ReactNode;
  disabledMessage?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}> = ({
  permission,
  agentScope,
  requireAdmin = false,
  onClick,
  children,
  disabledMessage = "Sin permisos suficientes",
  className = "",
  variant = 'primary',
}) => {
  const { hasPermission, canAccessAgent, isAdmin } = usePermissions();

  let hasAccess = false;

  if (requireAdmin) {
    hasAccess = isAdmin;
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (agentScope) {
    hasAccess = canAccessAgent(agentScope);
  }

  const baseClasses = "px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: hasAccess 
      ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500" 
      : "bg-gray-300 text-gray-500 cursor-not-allowed",
    secondary: hasAccess 
      ? "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500" 
      : "bg-gray-200 text-gray-400 cursor-not-allowed",
    danger: hasAccess 
      ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500" 
      : "bg-gray-300 text-gray-500 cursor-not-allowed",
  };

  return (
    <button
      onClick={hasAccess ? onClick : undefined}
      disabled={!hasAccess}
      title={!hasAccess ? disabledMessage : undefined}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Permission Link
 * Link that's only accessible if user has permission
 */
export const PermissionLink: React.FC<{
  permission?: string;
  agentScope?: string;
  requireAdmin?: boolean;
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({
  permission,
  agentScope,
  requireAdmin = false,
  href,
  children,
  className = "",
  onClick,
}) => {
  const { hasPermission, canAccessAgent, isAdmin } = usePermissions();

  let hasAccess = false;

  if (requireAdmin) {
    hasAccess = isAdmin;
  } else if (permission) {
    hasAccess = hasPermission(permission);
  } else if (agentScope) {
    hasAccess = canAccessAgent(agentScope);
  }

  if (!hasAccess) {
    return (
      <span className={`text-gray-400 cursor-not-allowed ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      onClick={onClick}
      className={`text-blue-600 hover:text-blue-800 ${className}`}
    >
      {children}
    </a>
  );
};

/**
 * Permission Badge
 * Show user's permission level as a badge
 */
export const PermissionBadge: React.FC<{
  showRole?: boolean;
  showPermissionCount?: boolean;
  className?: string;
}> = ({ showRole = true, showPermissionCount = false, className = "" }) => {
  const { isAdmin, userPermissions } = usePermissions();

  const badgeClass = isAdmin 
    ? "bg-red-100 text-red-800 border-red-200" 
    : "bg-blue-100 text-blue-800 border-blue-200";

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass} ${className}`}>
      {isAdmin ? "Administrador" : "Usuario"}
      {showPermissionCount && (
        <span className="ml-1">({userPermissions.length} permisos)</span>
      )}
    </div>
  );
};