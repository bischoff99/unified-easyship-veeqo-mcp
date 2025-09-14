import { EasyPostClient, EasyPostAddress, EasyPostParcel } from './easypost-enhanced.js';
import { CanonicalRate, PurchasedLabel, ShipmentRequest, ShippingProvider } from '../../core/types.js';

export class EasyPostShippingAdapter implements ShippingProvider {
  private readonly client: EasyPostClient;

  constructor(client?: EasyPostClient) {
    this.client = client ?? new EasyPostClient();
  }

  async getRates(request: ShipmentRequest): Promise<CanonicalRate[]> {
    const to = this.mapAddress(request.to);
    const from = this.mapAddress(request.from);
    const parcel = this.mapParcel(request.parcel);
    const rates = await this.client.getRates(to, from, parcel, request.carriers, request.customs);
    return rates.map((r) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      currency: r.currency,
      amount: parseFloat(r.rate),
      deliveryDays: r.delivery_days,
      estimatedDeliveryDate: r.delivery_date,
      provider: 'easypost',
      raw: r,
    }));
  }

  async buyLabel(
    request: ShipmentRequest & { rateId?: string; carrier: string; service: string }
  ): Promise<PurchasedLabel> {
    const to = this.mapAddress(request.to);
    const from = this.mapAddress(request.from);
    const parcel = this.mapParcel(request.parcel);
    const label = await this.client.createLabel(
      to,
      from,
      parcel,
      request.carrier,
      request.service,
      request.customs
    );
    return {
      trackingCode: label.tracking_code,
      carrier: label.carrier,
      service: label.service,
      amount: label.rate ? parseFloat(label.rate) : undefined,
      currency: 'USD',
      labelUrl: label.label_url,
      provider: 'easypost',
      raw: label,
    };
  }

  private mapAddress(a: ShipmentRequest['to']): EasyPostAddress {
    return {
      name: a.name ?? 'Recipient',
      company: a.company,
      street1: a.street1,
      street2: a.street2,
      city: a.city,
      state: a.state ?? '',
      zip: a.zip,
      country: a.country,
      phone: a.phone,
      email: a.email,
    };
  }

  private mapParcel(p: ShipmentRequest['parcel']): EasyPostParcel {
    return {
      length: p.length,
      width: p.width,
      height: p.height,
      weight: p.weightOz,
      predefined_package: p.predefinedPackage,
    };
  }
}

