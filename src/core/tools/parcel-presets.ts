/**
 * Parcel presets tool
 * Returns common shipping package presets
 */

export async function parcelPresets() {
  return {
    presets: [
      { name: "Small Box", dimensions: "8x6x4", weight_oz: 16 },
      { name: "Medium Box", dimensions: "12x10x6", weight_oz: 32 },
      { name: "Large Box", dimensions: "18x14x8", weight_oz: 48 },
      { name: "Apparel Box", dimensions: "22x18x5", weight_oz: 24 },
      { name: "Envelope", dimensions: "12x9x1", weight_oz: 4 },
      { name: "Padded Envelope", dimensions: "14x11x2", weight_oz: 8 },
    ],
  };
}
