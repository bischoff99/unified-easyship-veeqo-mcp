/**
 * Health check tool
 */

export async function health(_params: any) {
  // Simple health check
  return { status: 'healthy', timestamp: new Date().toISOString() };
}
