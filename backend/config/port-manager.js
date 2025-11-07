/**
 * Port Manager - Dynamic Port Allocation
 * Prevents port conflicts and manages service ports
 */

const net = require('net');

class PortManager {
  constructor() {
    // Default port assignments
    this.ports = {
      main: parseInt(process.env.PORT) || 5000,
      node: parseInt(process.env.NODE_PORT) || 5001,
      demo: parseInt(process.env.DEMO_PORT) || 5002,
      websocket: parseInt(process.env.WS_PORT) || 5003,
      metrics: parseInt(process.env.METRICS_PORT) || 5004,
      health: parseInt(process.env.HEALTH_PORT) || 5005
    };

    this.allocatedPorts = new Set();
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(false);
        }
      });

      server.once('listening', () => {
        server.close();
        resolve(true);
      });

      server.listen(port);
    });
  }

  /**
   * Get next available port starting from a given port
   */
  async getAvailablePort(startPort = 5000, maxAttempts = 100) {
    for (let i = 0; i < maxAttempts; i++) {
      const port = startPort + i;
      
      // Skip already allocated ports
      if (this.allocatedPorts.has(port)) {
        continue;
      }

      const available = await this.isPortAvailable(port);
      if (available) {
        this.allocatedPorts.add(port);
        return port;
      }
    }

    throw new Error(`No available ports found starting from ${startPort}`);
  }

  /**
   * Get port for a specific service, finding alternative if not available
   */
  async getServicePort(serviceName) {
    const defaultPort = this.ports[serviceName];
    
    if (!defaultPort) {
      throw new Error(`Unknown service: ${serviceName}`);
    }

    const available = await this.isPortAvailable(defaultPort);
    
    if (available) {
      this.allocatedPorts.add(defaultPort);
      return defaultPort;
    }

    // Find alternative port
    console.warn(`⚠️  Port ${defaultPort} for ${serviceName} is in use, finding alternative...`);
    const alternativePort = await this.getAvailablePort(defaultPort + 1);
    console.log(`✅ ${serviceName} assigned to port ${alternativePort}`);
    
    return alternativePort;
  }

  /**
   * Release a port when service stops
   */
  releasePort(port) {
    this.allocatedPorts.delete(port);
  }

  /**
   * Get all allocated ports
   */
  getAllocatedPorts() {
    return Array.from(this.allocatedPorts);
  }

  /**
   * Validate all configured ports are available
   */
  async validateAllPorts() {
    const results = {};
    
    for (const [service, port] of Object.entries(this.ports)) {
      const available = await this.isPortAvailable(port);
      results[service] = {
        port,
        available,
        status: available ? '✅' : '❌'
      };
    }

    return results;
  }

  /**
   * Print port allocation report
   */
  async printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PORT ALLOCATION REPORT');
    console.log('='.repeat(60));
    
    const results = await this.validateAllPorts();
    
    for (const [service, info] of Object.entries(results)) {
      console.log(`${info.status} ${service.padEnd(15)} - Port ${info.port} ${!info.available ? '(IN USE)' : ''}`);
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// Singleton instance
const portManager = new PortManager();

module.exports = portManager;
