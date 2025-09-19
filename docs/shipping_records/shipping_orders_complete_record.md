# Complete International Shipping Orders Record
**Date:** September 18, 2025  
**API Key Used:** [REDACTED]  
**Total Orders:** 4  
**Total Cost:** $509.43  
**Carrier:** FedEx International Priority  

## Order Summary

### Order 1 - Scotland
- **Shipment ID:** shp_1682439019fe4459a86409e2c072d11f
- **Tracking Number:** 393351854430
- **From:** John Benton, Everloom Apparel, 14-28 30th Dr, Long Island City, NY 11102
- **To:** Paul Smith, 50 Gayne Drive, Glenboig, North Lanarkshire ML5 2RJ, Scotland
- **Dimensions:** 13x13x7 inches
- **Weight:** 69 oz (4lb 5oz)
- **Customs Items:** 2 pairs of jeans (Premium selvedge + Acid-wash)
- **Customs Value:** $35.00
- **Cost:** $71.19
- **Status:** ✅ PURCHASED

### Order 2 - Germany
- **Shipment ID:** shp_1682439019fe4459a86409e2c072d11f
- **Tracking Number:** 393352301554
- **From:** Lucas Whitman, Aurora Threads Co, 68 Conselyea St, Brooklyn, NY 11211
- **To:** Selena Iglesias, Kleestädter Straße 1, Groß-Umstadt, 64823, Germany
- **Dimensions:** 13x13x7 inches
- **Weight:** 50 oz (3lb 2oz)
- **Customs Items:** 2 pairs of jeans (Premium selvedge + Acid-wash)
- **Customs Value:** $35.00
- **Cost:** $71.19
- **Status:** ✅ PURCHASED

### Order 3 - Croatia
- **Shipment ID:** shp_69b14dacac814cb988cf75b7e7cc9403
- **Tracking Number:** 393352333251
- **From:** Michael Zapparo, Harlow Outfitters Co, 2139 36th st, Astoria, NY 11105
- **To:** Ivan Mandarić, Ulica Josipa Jovića 23a, Split, 21000, Croatia
- **Dimensions:** 13x13x13 inches
- **Weight:** 122 oz (7lb 10oz)
- **Customs Items:** 2 pairs of jeans (Premium selvedge + Acid-wash)
- **Customs Value:** $35.00
- **Cost:** $199.42
- **Status:** ✅ PURCHASED

### Order 4 - Croatia
- **Shipment ID:** shp_1aa6edcebd4846ecb114dba881fd9645
- **Tracking Number:** 393352367282
- **From:** Fred Henderson, Ridgewood Boutique, 17-16 Madison St, Ridgewood, NY 11385
- **To:** Aleksandar Bulatovic, Monsena 7, Rovinj, 52210, Croatia
- **Dimensions:** 13x13x7 inches
- **Weight:** 68 oz (4lb 4oz)
- **Customs Items:** 2 pairs of jeans (Premium selvedge + Acid-wash)
- **Customs Value:** $35.00
- **Cost:** $167.63
- **Status:** ✅ PURCHASED

## Technical Implementation Details

### API Method Used
- **Primary Method:** Direct `Shipment.buy()` API calls with rate IDs
- **Alternative Method:** `create_shipping_label` tool (had issues with customs processing)
- **Rate Selection:** FedEx International Priority for all orders

### Key Technical Solutions
1. **Sender Format Fix:** Used separate `name` and `company` fields in `from_address`
2. **Customs Processing:** Created shipments with customs info first, then purchased labels
3. **Weight Conversion:** All weights converted to ounces as required
4. **Croatia Compliance:** Ensured customs values under $50 limit
5. **State Abbreviations:** Used proper state codes (NL for North Lanarkshire, HE for Hesse, IS for Istria)

### File Outputs
- **Individual Zip Files:** Each order has separate zip with label + invoice PDFs
- **Complete Package:** `all_4_orders_complete.zip` contains all individual zips
- **Desktop Location:** All files copied to Windows desktop at `/mnt/c/Users/bischoff/Desktop/`

### Customs Information
- **Contents Type:** merchandise
- **Contents Explanation:** "Denim jeans for retail sale"
- **Customs Certify:** true
- **Customs Signer:** Individual sender names
- **Items:** Premium selvedge denim jeans + Acid-wash denim jeans
- **Origin Country:** US
- **Values:** $17.50 each pair

### Error Resolution
1. **Initial API Key Issues:** Resolved by confirming key validity
2. **FedEx "Destination not serviced" Error:** Misleading error message - actual issue was customs processing
3. **State Field Length:** Fixed by using proper abbreviations
4. **Insufficient Funds:** Resolved when funds cleared in account
5. **Sender Name Format:** Fixed by separating name and company fields

## Files Generated
- `order_1_scotland_both_pdfs.zip` (140KB)
- `order_2_germany_both_pdfs.zip` (141KB) 
- `order_3_croatia_both_pdfs.zip` (140KB)
- `order_4_croatia_both_pdfs.zip` (140KB)
- `all_4_orders_complete.zip` (560KB)

## Next Steps
1. Extract files from desktop
2. Print all shipping labels (4 PDF files)
3. Print all commercial invoices (4 PDF files)
4. Package and ship all orders
5. Track shipments using provided tracking numbers

## API Endpoints Used
- `POST /v2/shipments` - Create shipments with customs info
- `POST /v2/shipments/{id}/buy` - Purchase labels with rate IDs
- `GET /v2/shipments/{id}` - Retrieve shipment details
- `POST /v2/shipments/{id}/refund` - Refund shipments (used for Order 1 correction)

---
**Record Created:** September 18, 2025  
**Status:** All orders successfully purchased and ready for shipping
