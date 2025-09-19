#!/usr/bin/env node

/**
 * Graceful shutdown handler for FastMCP server
 * Ensures proper cleanup and connection handling during shutdown
 */

import { logger } from "../dist/utils/logger.js";
import { performanceMonitor } from "../dist/utils/performance-monitor.js";

class GracefulShutdown {
  constructor() {
    this.isShuttingDown = false;
    this.connections = new Set();
    this.timers = new Set();
    this.cleanup = [];

    this.setupSignalHandlers();
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  setupSignalHandlers() {
    // Handle SIGINT (Ctrl+C)
    process.on("SIGINT", () => {
      logger.info("Received SIGINT signal");
      this.initiateShutdown("SIGINT");
    });

    // Handle SIGTERM (Docker/Kubernetes termination)
    process.on("SIGTERM", () => {
      logger.info("Received SIGTERM signal");
      this.initiateShutdown("SIGTERM");
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error(
        { error: error.message, stack: error.stack },
        "Uncaught exception",
      );
      this.initiateShutdown("UNCAUGHT_EXCEPTION");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      logger.error({ reason, promise }, "Unhandled promise rejection");
      this.initiateShutdown("UNHANDLED_REJECTION");
    });

    // Handle SIGUSR2 (nodemon restart)
    process.on("SIGUSR2", () => {
      logger.info("Received SIGUSR2 signal (development restart)");
      this.initiateShutdown("SIGUSR2");
    });
  }

  /**
   * Register a connection to track during shutdown
   */
  registerConnection(connection) {
    this.connections.add(connection);

    // Remove connection when it closes
    connection.on("close", () => {
      this.connections.delete(connection);
    });

    connection.on("error", () => {
      this.connections.delete(connection);
    });
  }

  /**
   * Register a timer to clear during shutdown
   */
  registerTimer(timerId) {
    this.timers.add(timerId);
  }

  /**
   * Register a cleanup function
   */
  registerCleanup(cleanupFunction) {
    this.cleanup.push(cleanupFunction);
  }

  /**
   * Initiate graceful shutdown process
   */
  async initiateShutdown(signal) {
    if (this.isShuttingDown) {
      logger.warn("Shutdown already in progress, forcing exit...");
      process.exit(1);
    }

    this.isShuttingDown = true;
    logger.info({ signal }, "Initiating graceful shutdown");

    // Set timeout for force shutdown
    const shutdownTimeout = setTimeout(() => {
      logger.error("Graceful shutdown timeout, forcing exit");
      process.exit(1);
    }, 30000); // 30 second timeout

    try {
      // 1. Stop accepting new connections
      logger.info("Step 1: Stop accepting new connections");
      await this.stopAcceptingConnections();

      // 2. Close existing connections gracefully
      logger.info(
        `Step 2: Closing ${this.connections.size} active connections`,
      );
      await this.closeConnections();

      // 3. Clear timers and intervals
      logger.info(`Step 3: Clearing ${this.timers.size} timers`);
      await this.clearTimers();

      // 4. Run cleanup functions
      logger.info(`Step 4: Running ${this.cleanup.length} cleanup functions`);
      await this.runCleanup();

      // 5. Generate final performance report
      logger.info("Step 5: Generating final performance report");
      await this.generateFinalReport();

      // 6. Flush logs
      logger.info("Step 6: Flushing logs");
      await this.flushLogs();

      clearTimeout(shutdownTimeout);
      logger.info("Graceful shutdown completed successfully");
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimeout);
      logger.error({ error: error.message }, "Error during graceful shutdown");
      process.exit(1);
    }
  }

  /**
   * Stop accepting new connections
   */
  async stopAcceptingConnections() {
    // This would be implemented by the server to stop listening
    // For FastMCP servers, this might involve stopping the stdio transport
    return new Promise((resolve) => {
      setTimeout(resolve, 100); // Brief pause to prevent race conditions
    });
  }

  /**
   * Close all active connections
   */
  async closeConnections() {
    const connectionPromises = Array.from(this.connections).map(
      (connection) => {
        return new Promise((resolve) => {
          if (connection.destroyed) {
            resolve();
            return;
          }

          // Try to close gracefully first
          if (typeof connection.close === "function") {
            connection.close(() => resolve());
          } else if (typeof connection.end === "function") {
            connection.end(() => resolve());
          } else if (typeof connection.destroy === "function") {
            connection.destroy();
            resolve();
          } else {
            resolve();
          }

          // Force close after timeout
          setTimeout(() => {
            if (
              !connection.destroyed &&
              typeof connection.destroy === "function"
            ) {
              connection.destroy();
            }
            resolve();
          }, 5000);
        });
      },
    );

    await Promise.all(connectionPromises);
    this.connections.clear();
  }

  /**
   * Clear all timers
   */
  async clearTimers() {
    for (const timerId of this.timers) {
      try {
        clearTimeout(timerId);
        clearInterval(timerId);
      } catch (error) {
        logger.warn({ timerId, error: error.message }, "Error clearing timer");
      }
    }
    this.timers.clear();
  }

  /**
   * Run all cleanup functions
   */
  async runCleanup() {
    for (const cleanupFn of this.cleanup) {
      try {
        await cleanupFn();
      } catch (error) {
        logger.warn({ error: error.message }, "Error during cleanup function");
      }
    }
  }

  /**
   * Generate final performance report
   */
  async generateFinalReport() {
    try {
      const summary = performanceMonitor.getPerformanceSummary();
      const recommendations =
        performanceMonitor.getOptimizationRecommendations();

      const report = {
        shutdownTime: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        performance: summary,
        recommendations: recommendations.slice(0, 10),
      };

      logger.info({ report }, "Final performance report");

      // Save to file if in development
      if (process.env.NODE_ENV === "development") {
        const fs = await import("fs/promises");
        const path = await import("path");

        try {
          const reportPath = path.join(
            process.cwd(),
            "logs",
            "shutdown-report.json",
          );
          await fs.mkdir(path.dirname(reportPath), { recursive: true });
          await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        } catch (error) {
          logger.warn(
            { error: error.message },
            "Could not save shutdown report to file",
          );
        }
      }
    } catch (error) {
      logger.warn({ error: error.message }, "Error generating final report");
    }
  }

  /**
   * Flush all logs
   */
  async flushLogs() {
    return new Promise((resolve) => {
      // Give pino time to flush logs
      setTimeout(resolve, 1000);
    });
  }

  /**
   * Check if server is shutting down
   */
  isShuttingDownFlag() {
    return this.isShuttingDown;
  }

  /**
   * Get shutdown status
   */
  getStatus() {
    return {
      isShuttingDown: this.isShuttingDown,
      activeConnections: this.connections.size,
      activeTimers: this.timers.size,
      cleanupFunctions: this.cleanup.length,
    };
  }
}

// Create singleton instance
const gracefulShutdown = new GracefulShutdown();

export default gracefulShutdown;

// Export helpers for server integration
export const {
  registerConnection,
  registerTimer,
  registerCleanup,
  isShuttingDownFlag,
  getStatus,
} = gracefulShutdown;
