// Health check tool

export async function health() {
  const start = Date.now();
  try {
    // Simple health check - just return healthy status
    const latency = Date.now() - start;
    return { status: 'healthy', latency_ms: latency, timestamp: new Date().toISOString() };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    };
  }
}
