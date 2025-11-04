/**
 * CRM Components Export Module
 * 
 * This module exports all CRM components for easy importing throughout the application.
 * 
 * Usage:
 * import { DealKanban, ContactManager, PipelineManager } from './components/crm';
 * 
 * Features:
 * - DealKanban: Drag-and-drop kanban board for visual deal management
 * - ContactManager: Comprehensive contact and lead management interface
 * - PipelineManager: Configure and manage sales pipelines with stages
 * - BoardView: Multi-view board display supporting different visualization modes
 * - WorkspaceSettings: Comprehensive workspace administration interface
 * - CRMDashboard: Main dashboard integrating all CRM modules with navigation
 */

// Main Dashboard Component
export { default as CRMDashboard } from './CRMDashboard';

// Deal Management Components
export { default as DealKanban } from './DealKanban';

// Contact Management Components
export { default as ContactManager } from './ContactManager';

// Pipeline Management Components
export { default as PipelineManager } from './PipelineManager';

// Board Management Components
export { default as BoardView } from './BoardView';

// Workspace Management Components
export { default as WorkspaceSettings } from './WorkspaceSettings';

// Re-export all components as a named object for convenience
export default {
  CRMDashboard,
  DealKanban,
  ContactManager,
  PipelineManager,
  BoardView,
  WorkspaceSettings,
};
