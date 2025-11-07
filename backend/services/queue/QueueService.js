/**
 * Queue Service
 * Async task processing with Bull (Redis-based queue)
 * 
 * Features:
 * - Job scheduling and retry
 * - Priority queues
 * - Concurrent processing
 * - Progress tracking
 * - Failed job handling
 * - Scheduled/delayed jobs
 * - Job metrics and monitoring
 */

const Bull = require('bull');
const { EventEmitter } = require('events');

class QueueService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      redis: {
        host: config.redisHost || process.env.REDIS_HOST || 'localhost',
        port: config.redisPort || process.env.REDIS_PORT || 6379,
        password: config.redisPassword || process.env.REDIS_PASSWORD
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      },
      ...config
    };

    // Queue instances
    this.queues = new Map();
    
    // Job processors
    this.processors = new Map();

    // Statistics
    this.stats = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      activeJobs: 0,
      byQueue: {}
    };

    this.initialized = false;
  }

  /**
   * Initialize queue service
   */
  async initialize() {
    if (this.initialized) return;

    // Create default queues
    await this.createQueue('ai-tasks', { concurrency: 5 });
    await this.createQueue('voice-processing', { concurrency: 3 });
    await this.createQueue('vision-processing', { concurrency: 3 });
    await this.createQueue('email-notifications', { concurrency: 10 });
    await this.createQueue('analytics-aggregation', { concurrency: 2 });
    await this.createQueue('employee-analytics', { concurrency: 2 });
    await this.createQueue('customer-followup', { concurrency: 5 });

    this.initialized = true;
    this.emit('queue:initialized');
  }

  /**
   * Create a new queue
   */
  async createQueue(name, options = {}) {
    if (this.queues.has(name)) {
      return this.queues.get(name);
    }

    const queue = new Bull(name, {
      redis: this.config.redis,
      defaultJobOptions: {
        ...this.config.defaultJobOptions,
        ...options.jobOptions
      }
    });

    // Setup event listeners
    this.setupQueueEvents(queue, name);

    // Store queue
    this.queues.set(name, queue);
    
    // Initialize stats
    this.stats.byQueue[name] = {
      total: 0,
      completed: 0,
      failed: 0,
      active: 0
    };

    this.emit('queue:created', { name });

    return queue;
  }

  /**
   * Setup queue event listeners
   */
  setupQueueEvents(queue, name) {
    queue.on('completed', (job) => {
      this.stats.completedJobs++;
      this.stats.byQueue[name].completed++;
      this.emit('job:completed', { queue: name, jobId: job.id });
    });

    queue.on('failed', (job, err) => {
      this.stats.failedJobs++;
      this.stats.byQueue[name].failed++;
      this.emit('job:failed', { queue: name, jobId: job.id, error: err.message });
    });

    queue.on('active', (job) => {
      this.stats.activeJobs++;
      this.stats.byQueue[name].active++;
      this.emit('job:active', { queue: name, jobId: job.id });
    });

    queue.on('stalled', (job) => {
      this.emit('job:stalled', { queue: name, jobId: job.id });
    });

    queue.on('progress', (job, progress) => {
      this.emit('job:progress', { queue: name, jobId: job.id, progress });
    });
  }

  /**
   * Register job processor
   */
  registerProcessor(queueName, processor) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    this.processors.set(queueName, processor);

    queue.process(async (job) => {
      try {
        const result = await processor(job);
        return result;
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    });
  }

  /**
   * Add job to queue
   */
  async addJob(queueName, data, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.add(data, {
      priority: options.priority,
      delay: options.delay,
      attempts: options.attempts,
      backoff: options.backoff,
      ...options
    });

    this.stats.totalJobs++;
    this.stats.byQueue[queueName].total++;

    this.emit('job:added', { queue: queueName, jobId: job.id });

    return job;
  }

  /**
   * Add bulk jobs
   */
  async addBulkJobs(queueName, jobs) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const bulkJobs = jobs.map(job => ({
      data: job.data,
      opts: job.options || {}
    }));

    const result = await queue.addBulk(bulkJobs);
    
    this.stats.totalJobs += result.length;
    this.stats.byQueue[queueName].total += result.length;

    return result;
  }

  /**
   * Get job by ID
   */
  async getJob(queueName, jobId) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJob(jobId);
  }

  /**
   * Get queue counts
   */
  async getQueueCounts(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJobCounts();
  }

  /**
   * Get all queues info
   */
  async getAllQueuesInfo() {
    const info = {};

    for (const [name, queue] of this.queues.entries()) {
      const counts = await queue.getJobCounts();
      info[name] = {
        ...counts,
        stats: this.stats.byQueue[name]
      };
    }

    return info;
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.emit('queue:paused', { queue: queueName });
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.emit('queue:resumed', { queue: queueName });
  }

  /**
   * Clean queue (remove old jobs)
   */
  async cleanQueue(queueName, grace = 3600000, status = 'completed') {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const jobs = await queue.clean(grace, status);
    this.emit('queue:cleaned', { queue: queueName, count: jobs.length });
    
    return jobs;
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const failedJobs = await queue.getFailed();
    
    for (const job of failedJobs) {
      await job.retry();
    }

    return failedJobs.length;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      queues: Object.keys(this.stats.byQueue).length
    };
  }

  /**
   * Close all queues
   */
  async close() {
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
    }
    
    this.queues.clear();
    this.processors.clear();
    this.initialized = false;
  }
}

// Singleton
let queueServiceInstance = null;

async function getQueueService(config = {}) {
  if (!queueServiceInstance) {
    queueServiceInstance = new QueueService(config);
    await queueServiceInstance.initialize();
  }
  return queueServiceInstance;
}

module.exports = {
  QueueService,
  getQueueService
};
