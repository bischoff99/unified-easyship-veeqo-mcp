#!/usr/bin/env node

/**
 * Webhook Handler Example
 * Shows how to handle delivery status webhooks and send notifications
 */

import express from 'express';
import nodemailer from 'nodemailer';

const app = express();
app.use(express.json());

// Email configuration (replace with your email service)
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail', // or your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Webhook handler for delivery status changes
app.post('/webhooks/delivery', async (req, res) => {
  try {
    const { event, data } = req.body;

    console.log(`📦 Delivery webhook received: ${event}`);
    console.log('Data:', JSON.stringify(data, null, 2));

    // Handle different delivery status events
    switch (event) {
      case 'shipment.created':
        await handleShipmentCreated(data);
        break;

      case 'shipment.purchased':
        await handleShipmentPurchased(data);
        break;

      case 'shipment.picked_up':
        await handleShipmentPickedUp(data);
        break;

      case 'tracker.updated':
        await handleTrackerUpdated(data);
        break;

      case 'shipment.delivered':
        await handleShipmentDelivered(data);
        break;

      case 'shipment.exception':
        await handleShipmentException(data);
        break;

      case 'shipment.returned':
        await handleShipmentReturned(data);
        break;

      default:
        console.log(`Unknown event: ${event}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Handle shipment created
async function handleShipmentCreated(data) {
  console.log('🚚 Shipment created:', data.id);

  // Send confirmation email to customer
  await sendEmail({
    to: data.customer?.email,
    subject: 'Shipping Label Created - Order Ready to Ship',
    template: 'shipment_created',
    data: {
      orderNumber: data.reference,
      trackingNumber: data.tracking_code,
      carrier: data.carrier,
    },
  });
}

// Handle shipment purchased
async function handleShipmentPurchased(data) {
  console.log('💳 Shipment purchased:', data.id);

  // Update order status in your system
  await updateOrderStatus(data.reference, 'shipped');
}

// Handle shipment picked up
async function handleShipmentPickedUp(data) {
  console.log('📦 Shipment picked up:', data.id);

  // Send shipping notification to customer
  await sendEmail({
    to: data.customer?.email,
    subject: 'Your Order is On the Way!',
    template: 'shipment_picked_up',
    data: {
      orderNumber: data.reference,
      trackingNumber: data.tracking_code,
      carrier: data.carrier,
      estimatedDelivery: data.estimated_delivery,
    },
  });
}

// Handle tracker updated (delivery status changes)
async function handleTrackerUpdated(data) {
  console.log('📍 Tracker updated:', data.status);

  const { status, tracking_code, carrier, location, estimated_delivery } = data;

  // Send appropriate notification based on status
  switch (status) {
    case 'in_transit':
      await sendEmail({
        to: data.customer?.email,
        subject: 'Package In Transit - On the Way!',
        template: 'in_transit',
        data: { trackingNumber: tracking_code, carrier, location },
      });
      break;

    case 'out_for_delivery':
      await sendEmail({
        to: data.customer?.email,
        subject: 'Out for Delivery Today!',
        template: 'out_for_delivery',
        data: { trackingNumber: tracking_code, carrier, estimatedDelivery },
      });
      break;

    case 'delivered':
      await sendEmail({
        to: data.customer?.email,
        subject: 'Package Delivered Successfully!',
        template: 'delivered',
        data: { trackingNumber: tracking_code, carrier, deliveredAt: new Date() },
      });
      break;
  }
}

// Handle shipment delivered
async function handleShipmentDelivered(data) {
  console.log('✅ Shipment delivered:', data.id);

  // Send delivery confirmation
  await sendEmail({
    to: data.customer?.email,
    subject: 'Package Delivered - Thank You!',
    template: 'delivered',
    data: {
      orderNumber: data.reference,
      trackingNumber: data.tracking_code,
      carrier: data.carrier,
      deliveredAt: data.delivered_at,
    },
  });

  // Update inventory if needed
  await updateInventoryAfterDelivery(data.reference);
}

// Handle shipment exception
async function handleShipmentException(data) {
  console.log('⚠️ Shipment exception:', data.message);

  // Alert staff to delivery issue
  await sendEmail({
    to: process.env.STAFF_EMAIL,
    subject: 'Delivery Issue - Action Required',
    template: 'delivery_exception',
    data: {
      orderNumber: data.reference,
      trackingNumber: data.tracking_code,
      issue: data.message,
      carrier: data.carrier,
    },
  });

  // Notify customer of delay
  await sendEmail({
    to: data.customer?.email,
    subject: "Delivery Update - We're On It!",
    template: 'delivery_delay',
    data: {
      orderNumber: data.reference,
      trackingNumber: data.tracking_code,
      issue: data.message,
    },
  });
}

// Handle shipment returned
async function handleShipmentReturned(data) {
  console.log('↩️ Shipment returned:', data.id);

  // Process return automatically
  await processReturn(data.reference);

  // Notify customer
  await sendEmail({
    to: data.customer?.email,
    subject: 'Package Returned - Next Steps',
    template: 'package_returned',
    data: {
      orderNumber: data.reference,
      trackingNumber: data.tracking_code,
      reason: data.return_reason,
    },
  });
}

// Send email notification
async function sendEmail({ to, subject, template, data }) {
  if (!to) {
    console.log('No email address provided');
    return;
  }

  try {
    const html = generateEmailHTML(template, data);

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error('Email error:', error);
  }
}

// Generate email HTML based on template
function generateEmailHTML(template, data) {
  const templates = {
    shipment_created: `
      <h2>Shipping Label Created</h2>
      <p>Your order ${data.orderNumber} is ready to ship!</p>
      <p>Tracking: ${data.trackingNumber}</p>
      <p>Carrier: ${data.carrier}</p>
    `,

    shipment_picked_up: `
      <h2>Your Order is On the Way!</h2>
      <p>Great news! Your order ${data.orderNumber} has been picked up and is on its way to you.</p>
      <p>Tracking: ${data.trackingNumber}</p>
      <p>Carrier: ${data.carrier}</p>
      <p>Estimated Delivery: ${data.estimatedDelivery}</p>
    `,

    in_transit: `
      <h2>Package In Transit</h2>
      <p>Your package is moving through the ${data.carrier} network.</p>
      <p>Current Location: ${data.location}</p>
      <p>Tracking: ${data.trackingNumber}</p>
    `,

    out_for_delivery: `
      <h2>Out for Delivery Today!</h2>
      <p>Your package is out for delivery and should arrive today!</p>
      <p>Tracking: ${data.trackingNumber}</p>
      <p>Estimated Delivery: ${data.estimatedDelivery}</p>
    `,

    delivered: `
      <h2>Package Delivered Successfully!</h2>
      <p>Your order has been delivered. Thank you for shopping with us!</p>
      <p>Tracking: ${data.trackingNumber}</p>
      <p>Delivered: ${data.deliveredAt}</p>
    `,

    delivery_exception: `
      <h2>Delivery Issue - Action Required</h2>
      <p>Order: ${data.orderNumber}</p>
      <p>Issue: ${data.issue}</p>
      <p>Tracking: ${data.trackingNumber}</p>
    `,

    delivery_delay: `
      <h2>Delivery Update</h2>
      <p>We're aware of a delivery issue with your order ${data.orderNumber}.</p>
      <p>Issue: ${data.issue}</p>
      <p>We're working to resolve this quickly. Thank you for your patience!</p>
    `,

    package_returned: `
      <h2>Package Returned</h2>
      <p>Your package for order ${data.orderNumber} has been returned.</p>
      <p>Reason: ${data.reason}</p>
      <p>We'll contact you soon about next steps.</p>
    `,
  };

  return templates[template] || '<p>Delivery update</p>';
}

// Update order status in your system
async function updateOrderStatus(orderNumber, status) {
  console.log(`📝 Updating order ${orderNumber} to status: ${status}`);
  // Implement your order status update logic
}

// Update inventory after delivery
async function updateInventoryAfterDelivery(orderNumber) {
  console.log(`📦 Updating inventory for delivered order: ${orderNumber}`);
  // Implement your inventory update logic
}

// Process return
async function processReturn(orderNumber) {
  console.log(`↩️ Processing return for order: ${orderNumber}`);
  // Implement your return processing logic
}

// Start the webhook server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚚 Delivery webhook server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhooks/delivery`);
});

export default app;
