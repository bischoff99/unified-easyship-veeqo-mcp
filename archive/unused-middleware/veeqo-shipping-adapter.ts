import { VeeqoClient as VeeqoRawClient } from './veeqo.js';
import { CanonicalRate, PurchasedLabel, ShipmentRequest, ShippingProvider } from '../../core/types.js';

export class VeeqoShippingAdapter implements ShippingProvider {
  private readonly client: VeeqoRawClient;

  constructor(client?: VeeqoRawClient) {
    this.client = client ?? new VeeqoRawClient();
  }

  async getRates(request: ShipmentRequest): Promise<CanonicalRate[]> {
    const ratesPath = (globalThis as any).process?.env?.VEEQO_ENDPOINT_RATES || '/rate_shopping/rates';
    const response = await this.client.request(ratesPath, { method: 'GET' });

    const rates = Array.isArray(response.rates) ? response.rates : [];
    return rates
      .filter((r: any) =>
        !request.carriers || request.carriers.length === 0
          ? true
          : request.carriers.some((c) => r.carrier.toLowerCase().includes(c.toLowerCase()))
      )
      .map((r: any) => ({
        id: r.id,
        carrier: r.carrier,
        service: r.service,
        currency: r.currency || 'USD',
        amount: typeof r.price === 'number' ? r.price : parseFloat(r.price),
        deliveryDays: r.delivery_days,
        estimatedDeliveryDate: r.delivery_date ?? null,
        provider: 'veeqo',
        raw: r,
      }));
  }

  async buyLabel(
    _request: ShipmentRequest & { rateId?: string; carrier: string; service: string }
  ): Promise<PurchasedLabel> {
    const purchasePath = (globalThis as any).process?.env?.VEEQO_ENDPOINT_PURCHASE || '/rate_shopping/labels';
    const response = await this.client.request(purchasePath, { method: 'POST', body: JSON.stringify({}) });

    return {
      trackingCode: response.tracking_number || 'MOCK',
      carrier: response.carrier || 'UPS',
      service: response.service || 'Ground',
      currency: response.currency || 'USD',
      provider: 'veeqo',
      raw: response,
    };
  }
}

