/**
 * Workflow Designer Component
 * Visual drag-and-drop workflow builder
 */

import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Paper,
  Typography,
  Button,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  PlayArrow,
  Save,
  Add,
  Settings,
  Email,
  Sms,
  Timer,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  data: {
    label: string;
    config: Record<string, any>;
  };
  position: { x: number; y: number };
}

const nodeTypes = {
  trigger: [
    { id: 'booking_created', label: 'Booking Created', icon: <CheckCircle /> },
    { id: 'payment_received', label: 'Payment Received', icon: <CheckCircle /> },
    { id: 'customer_registered', label: 'Customer Registered', icon: <Add /> },
  ],
  action: [
    { id: 'send_email', label: 'Send Email', icon: <Email /> },
    { id: 'send_sms', label: 'Send SMS', icon: <Sms /> },
    { id: 'create_ticket', label: 'Create Ticket', icon: <Add /> },
    { id: 'update_crm', label: 'Update CRM', icon: <Settings /> },
  ],
  condition: [
    { id: 'if_then', label: 'If/Then', icon: <Settings /> },
    { id: 'delay', label: 'Delay', icon: <Timer /> },
  ],
};

export const WorkflowDesigner: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState('New Workflow');

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const addNode = (type: string, nodeType: 'trigger' | 'action' | 'condition') => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type: nodeType,
      data: {
        label: nodeTypes[nodeType].find(n => n.id === type)?.label || type,
        config: {},
      },
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setDrawerOpen(false);
  };

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setConfigDialogOpen(true);
  };

  const saveNodeConfig = () => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNode.id
            ? { ...node, data: { ...node.data, config: selectedNode.data.config } }
            : node
        )
      );
    }
    setConfigDialogOpen(false);
  };

  const saveWorkflow = async () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges,
      createdAt: new Date().toISOString(),
    };

    try {
      // Save workflow to backend
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow),
      });

      if (response.ok) {
        alert('Workflow saved successfully!');
      }
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow');
    }
  };

  const executeWorkflow = async () => {
    try {
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });

      if (response.ok) {
        alert('Workflow executed successfully!');
      }
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Failed to execute workflow');
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Workflow Components
          </Typography>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
            Triggers
          </Typography>
          <List dense>
            {nodeTypes.trigger.map((node) => (
              <ListItem
                key={node.id}
                button
                onClick={() => addNode(node.id, 'trigger')}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon>{node.icon}</ListItemIcon>
                <ListItemText primary={node.label} />
              </ListItem>
            ))}
          </List>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
            Actions
          </Typography>
          <List dense>
            {nodeTypes.action.map((node) => (
              <ListItem
                key={node.id}
                button
                onClick={() => addNode(node.id, 'action')}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon>{node.icon}</ListItemIcon>
                <ListItemText primary={node.label} />
              </ListItem>
            ))}
          </List>

          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'text.secondary' }}>
            Logic
          </Typography>
          <List dense>
            {nodeTypes.condition.map((node) => (
              <ListItem
                key={node.id}
                button
                onClick={() => addNode(node.id, 'condition')}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon>{node.icon}</ListItemIcon>
                <ListItemText primary={node.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Canvas */}
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        {/* Toolbar */}
        <Paper
          elevation={1}
          sx={{
            position: 'absolute',
            top: 16,
            left: drawerOpen ? 296 : 16,
            right: 16,
            zIndex: 1000,
            p: 1,
            display: 'flex',
            gap: 1,
            alignItems: 'center',
          }}
        >
          <TextField
            size="small"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder="Workflow Name"
            sx={{ width: 250 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="outlined"
            startIcon={<Save />}
            onClick={saveWorkflow}
          >
            Save
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={executeWorkflow}
          >
            Run
          </Button>
          <IconButton onClick={() => setDrawerOpen(!drawerOpen)}>
            <Settings />
          </IconButton>
        </Paper>

        {/* React Flow Canvas */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={handleNodeDoubleClick}
          fitView
          style={{ width: '100%', height: '100%' }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Box>

      {/* Node Configuration Dialog */}
      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure Node</DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Label"
                value={selectedNode.data.label}
                onChange={(e) =>
                  setSelectedNode({
                    ...selectedNode,
                    data: { ...selectedNode.data, label: e.target.value },
                  })
                }
                margin="normal"
              />
              {/* Add more configuration fields based on node type */}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button onClick={saveNodeConfig} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
