export const formatAddressLine = (address = {}) => {
  const parts = [address.houseFlatNo, address.streetArea, address.landmark]
    .map((part) => (part || '').trim())
    .filter(Boolean);

  if (parts.length) return parts.join(', ');
  return (address.addressLine || '').trim();
};

export const normalizeAddress = (address = {}) => {
  const houseFlatNo = (address.houseFlatNo || '').trim();
  let streetArea = (address.streetArea || '').trim();
  const landmark = (address.landmark || '').trim();

  if (!streetArea && address.addressLine) {
    streetArea = address.addressLine.trim();
  }

  const addressLine = formatAddressLine({ houseFlatNo, streetArea, landmark });

  return {
    fullName: (address.fullName || '').trim(),
    phone: (address.phone || '').trim(),
    houseFlatNo,
    streetArea,
    landmark,
    addressLine,
    city: (address.city || '').trim(),
    state: (address.state || '').trim(),
    postalCode: (address.postalCode || '').trim(),
    country: (address.country || '').trim(),
  };
};

export const validateShippingAddress = (address) => {
  const normalized = normalizeAddress(address);
  const missing = [];

  if (!normalized.fullName) missing.push('Recipient name');
  if (!normalized.phone) missing.push('Phone number');
  if (!normalized.houseFlatNo) missing.push('House / Flat number');
  if (!normalized.streetArea) missing.push('Street / Area');
  if (!normalized.city) missing.push('City');
  if (!normalized.state) missing.push('State');
  if (!normalized.postalCode) missing.push('Pincode');
  if (!normalized.country) missing.push('Country');

  return { valid: missing.length === 0, missing, normalized };
};
