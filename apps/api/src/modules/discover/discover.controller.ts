import { FastifyRequest, FastifyReply } from 'fastify';
import { runDiscovery } from './discover.service';

interface DiscoverRequestBody {
  source?: 'YC' | 'PRODUCT_HUNT' | 'WELLFOUND';
}

export async function handleDiscover(
  request: FastifyRequest<{ Body: DiscoverRequestBody }>,
  reply: FastifyReply
) {
  try {
    const { source } = request.body || {};

    if (source && !['YC', 'PRODUCT_HUNT', 'WELLFOUND'].includes(source)) {
      return reply.status(400).send({
        error: 'Invalid source. Supported sources: YC, PRODUCT_HUNT, WELLFOUND',
      });
    }

    console.log(`[Discover Controller] Initiating discovery. Source parameter: ${source || 'ALL'}`);
    const metrics = await runDiscovery(source);

    const message = `Found ${metrics.companiesFound} companies. Added ${metrics.companiesAdded}. Skipped ${metrics.duplicates} duplicates. Failures: ${metrics.failures}.`;
    
    return reply.status(200).send({
      companiesFound: metrics.companiesFound,
      companiesAdded: metrics.companiesAdded,
      duplicates: metrics.duplicates,
      failures: metrics.failures,
      message,
      runs: metrics.runs,
    });
  } catch (err: any) {
    request.log.error(err);
    return reply.status(500).send({
      error: 'Failed to execute company discovery',
      message: err.message,
    });
  }
}
