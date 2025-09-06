const EasyPostClient = require('@easypost/api');

const client = new EasyPostClient(process.env.EASYPOST_API_KEY);

async function testFedExServices() {
  try {
    console.log('🚀 Testing EasyPost API for FedEx services to Bosnia...\n');

    // Create shipment to Bosnia
    const shipment = await client.Shipment.create({
      from_address: {
        name: 'John Smith',
        company: 'Your Company',
        street1: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
        phone: '555-1234',
        email: 'john@company.com',
      },
      to_address: {
        name: 'Mirza Husić',
        street1: 'Mostar 88000',
        city: 'Mostar',
        zip: '88000',
        country: 'BA',
        email: 'mirza@example.com',
      },
      parcel: {
        length: 12,
        width: 9,
        height: 3,
        weight: 6.4375, // 6 lbs 7 oz
      },
    });

    console.log('✅ Shipment created successfully!');
    console.log(`📦 Shipment ID: ${shipment.id}\n`);

    // Get rates
    const rates = shipment.rates;
    console.log(`📊 Found ${rates.length} available rates:\n`);

    // Filter and display FedEx rates
    const fedexRates = rates.filter((rate) => rate.carrier === 'FedEx');

    if (fedexRates.length > 0) {
      console.log('🚚 Available FedEx Services:');
      fedexRates.forEach((rate, index) => {
        console.log(`${index + 1}. Service: ${rate.service}`);
        console.log(`   Rate: $${rate.rate}`);
        console.log(`   Delivery Days: ${rate.delivery_days || 'N/A'}`);
        console.log(`   ID: ${rate.id}\n`);
      });

      // Try to buy the cheapest FedEx rate
      const cheapestFedEx = fedexRates.reduce((cheapest, current) =>
        parseFloat(current.rate) < parseFloat(cheapest.rate) ? current : cheapest
      );

      console.log(
        `💰 Buying cheapest FedEx rate: ${cheapestFedEx.service} - $${cheapestFedEx.rate}`
      );

      const boughtShipment = await client.Shipment.buy(shipment.id, cheapestFedEx.id);

      console.log('✅ Label purchased successfully!');
      console.log(`🏷️  Tracking Code: ${boughtShipment.tracking_code}`);
      console.log(`📋 Label URL: ${boughtShipment.postage_label.label_url}`);
    } else {
      console.log('❌ No FedEx rates available for this destination');
      console.log('\n📋 All available carriers:');
      const carriers = [...new Set(rates.map((rate) => rate.carrier))];
      carriers.forEach((carrier) => {
        const carrierRates = rates.filter((rate) => rate.carrier === carrier);
        console.log(`- ${carrier}: ${carrierRates.length} services`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

testFedExServices();
