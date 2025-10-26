/**
 * Global registry for VLM workers
 * Manages worker instances across API requests
 */

import { VLMWorker } from "./vlm-worker";

class VLMWorkerRegistry {
  private workers: Map<string, VLMWorker> = new Map();

  /**
   * Register a worker for a room
   */
  register(roomName: string, worker: VLMWorker): void {
    // Stop existing worker if any
    this.stop(roomName);

    this.workers.set(roomName, worker);
    console.log(`[Registry] Registered worker for room: ${roomName}`);
  }

  /**
   * Get worker for a room
   */
  get(roomName: string): VLMWorker | undefined {
    return this.workers.get(roomName);
  }

  /**
   * Stop and remove worker for a room
   */
  async stop(roomName: string): Promise<boolean> {
    const worker = this.workers.get(roomName);
    if (worker) {
      await worker.stop();
      this.workers.delete(roomName);
      console.log(`[Registry] Stopped and removed worker for room: ${roomName}`);
      return true;
    }
    return false;
  }

  /**
   * Stop all workers
   */
  async stopAll(): Promise<void> {
    console.log(`[Registry] Stopping all workers (${this.workers.size} total)`);
    await Promise.all(
      Array.from(this.workers.values()).map((worker) => worker.stop())
    );
    this.workers.clear();
  }

  /**
   * Get all active room names
   */
  getActiveRooms(): string[] {
    return Array.from(this.workers.keys());
  }

  /**
   * Get status of all workers
   */
  getAllStatus() {
    const status: Record<string, any> = {};
    this.workers.forEach((worker, roomName) => {
      status[roomName] = worker.getStatus();
    });
    return status;
  }
}

// Export singleton instance
export const vlmWorkerRegistry = new VLMWorkerRegistry();
