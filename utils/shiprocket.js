let cachedToken = null;
let tokenExpiresAt = 0;
let cachedPickupLocation = null;

const sanitizeEnvValue = (value) => {
  if (!value) return '';
  let cleaned = String(value).trim();
  // Strip wrapping quotes even when followed by semicolon: 'https://...';
  cleaned = cleaned.replace(/^['"]+|['"]+;?$/g, '').trim();
  // Remove trailing semicolons or inline comments
  cleaned = cleaned.replace(/;+\s*(\/\/.*)?$/, '').trim();
  return cleaned;
};

const normalizeBaseUrl = (baseUrl) => {
  const cleaned = sanitizeEnvValue(baseUrl);
  if (!cleaned) return 'https://apiv2.shiprocket.in/v1/external';
  return cleaned.replace(/\/+$/, '');
};

const buildShiprocketUrl = (path) => {
  if (path.startsWith('http')) return path;
  const base = normalizeBaseUrl(getBaseUrl());
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  return `${base}${endpoint}`;
};

const getEnv = (keys, fallback = '') => {
  for (const key of keys) {
    if (process.env[key]) return sanitizeEnvValue(process.env[key]);
  }
  return fallback;
};

const getEnvNumber = (keys, fallback) => {
  const raw = getEnv(keys);
  const parsed = Number(raw);
  return raw && !Number.isNaN(parsed) ? parsed : fallback;
};

const resolvePickupConfig = () => {
  const rawLocation = getEnv(['SHIP_ROCKET_PICKUP_LOCATION', 'ship_rocket_pickup_location'], 'Primary');
  const explicitAddress = getEnv(['SHIP_ROCKET_PICKUP_ADDRESS', 'ship_rocket_pickup_address']);
  const explicitName = getEnv(['SHIP_ROCKET_PICKUP_NAME', 'ship_rocket_pickup_name']);

  // pickup_location must be a short nickname (max 36 chars) registered in Shiprocket panel
  const looksLikeFullAddress = rawLocation.length > 36 || rawLocation.includes(',');

  return {
    pickupLocation: looksLikeFullAddress
      ? (explicitName || 'RakaPrimary').slice(0, 36)
      : rawLocation.slice(0, 36),
    pickupName: explicitName || (looksLikeFullAddress ? 'Rakaarituals' : ''),
    pickupAddress: explicitAddress || (looksLikeFullAddress ? rawLocation.slice(0, 80) : ''),
    pickupAddress2: getEnv(['SHIP_ROCKET_PICKUP_ADDRESS_2', 'ship_rocket_pickup_address_2']),
    pickupCity: getEnv(['SHIP_ROCKET_PICKUP_CITY', 'ship_rocket_pickup_city'], 'Belagavi'),
    pickupState: getEnv(['SHIP_ROCKET_PICKUP_STATE', 'ship_rocket_pickup_state'], 'Karnataka'),
    pickupCountry: getEnv(['SHIP_ROCKET_PICKUP_COUNTRY', 'ship_rocket_pickup_country'], 'India'),
    pickupPhone: getEnv(['SHIP_ROCKET_PICKUP_PHONE', 'ship_rocket_pickup_phone']),
    pickupEmail: getEnv(['SHIP_ROCKET_PICKUP_EMAIL', 'ship_rocket_pickup_email']),
    pickupPincode: getEnv(['SHIP_ROCKET_PICKUP_PINCODE', 'ship_rocket_pickup_pincode'], '591244'),
  };
};

export const getShiprocketConfig = () => {
  const pickup = resolvePickupConfig();

  const email =
    getEnv(['SHIP_ROCKET_API_EMAIL', 'ship_rocket_api_email', 'SHIP_ROCKET_EMAIL', 'ship_rocket_email']) ||
    pickup.pickupEmail;

  const password = getEnv([
    'SHIP_ROCKET_API_PASSWORD',
    'ship_rocket_api_password',
    'SHIP_ROCKET_PASSWORD',
    'ship_rocket_password',
  ]);

  return {
    baseUrl: getEnv(
      ['SHIP_ROCKET_BASE_URL', 'ship_rocket_base_url'],
      'https://apiv2.shiprocket.in/v1/external'
    ),
    tokenTtlMs: getEnvNumber(
      ['SHIP_ROCKET_TOKEN_TTL_MS', 'ship_rocket_token_ttl_ms'],
      9 * 24 * 60 * 60 * 1000
    ),
    freeShippingThreshold: getEnvNumber(
      ['FREE_SHIPPING_THRESHOLD', 'SHIP_ROCKET_FREE_SHIPPING_THRESHOLD', 'ship_rocket_free_shipping_threshold'],
      799
    ),
    email,
    password,
    channelId: getEnv(['SHIP_ROCKET_CHANNEL_ID', 'ship_rocket_channel_id']),
    trackingPageUrl: getEnv(
      ['SHIPROCKET_TRACKING_PAGE_URL', 'SHIP_ROCKET_TRACKING_PAGE_URL'],
      'https://rakaarituals.shiprocket.co/tracking'
    ),
    ...pickup,
  };
};

export const getBaseUrl = () => normalizeBaseUrl(getShiprocketConfig().baseUrl);
export const getTokenTtlMs = () => getShiprocketConfig().tokenTtlMs;
export const getFreeShippingThreshold = () => getShiprocketConfig().freeShippingThreshold;

// 0 = free shipping disabled (always calculate live rates). >0 = free when itemsPrice >= threshold.
export const isFreeShippingEligible = (itemsPrice, threshold = getFreeShippingThreshold()) =>
  threshold > 0 && itemsPrice >= threshold;

export const getShiprocketConfigStatus = () => {
  const { email, password } = getShiprocketConfig();
  const missing = [];
  if (!email) missing.push('SHIP_ROCKET_API_EMAIL');
  if (!password) missing.push('SHIP_ROCKET_API_PASSWORD');
  return { configured: missing.length === 0, missing, hasEmail: Boolean(email), hasPassword: Boolean(password) };
};

export const isShiprocketConfigured = () => getShiprocketConfigStatus().configured;

const isAutoRegisterPickupEnabled = () =>
  getEnv(['SHIP_ROCKET_AUTO_REGISTER_PICKUP', 'ship_rocket_auto_register_pickup']) === 'true';

const enhanceShiprocketError = (step, error) => {
  const msg = error?.message || String(error);
  const isPermissionError =
    msg.toLowerCase().includes('unauthorized') ||
    msg.toLowerCase().includes('permission') ||
    msg.toLowerCase().includes('do not have permission');

  if (isPermissionError) {
    return new Error(
      `Shiprocket denied "${step}". Your API user lacks module permissions — not a localhost issue. ` +
      'In Shiprocket go to Settings → API Users → Update User → set "Select Modules" to ALL ' +
      '(needs Orders, Shipments, Couriers, Settings at minimum). ' +
      'The "Allowed IPs / server URL" field is only for PII data access, not API calls from your backend. ' +
      `Shiprocket said: ${msg}`
    );
  }
  return error;
};

const runShiprocketStep = async (step, fn) => {
  try {
    return await fn();
  } catch (error) {
    throw enhanceShiprocketError(step, error);
  }
};

const shiprocketFetch = async (path, options = {}, retry = true) => {
  const token = await getAuthToken();
  const url = buildShiprocketUrl(path);

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && retry) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return shiprocketFetch(path, options, false);
  }

  const isSuccessMessageResponse =
    res.ok &&
    data?.message &&
    typeof data.message === 'string' &&
    /cancel(l)?ed?\s+successfully|successfully\s+cancel(l)?ed/i.test(data.message);

  const hasDocumentUrl =
    data?.invoice_url ||
    data?.manifest_url ||
    data?.label_url ||
    data?.url ||
    data?.response?.invoice_url ||
    data?.response?.manifest_url;

  const isSoftError =
    res.ok &&
    data?.message &&
    !isSuccessMessageResponse &&
    !hasDocumentUrl &&
    !data?.order_id &&
    !data?.shipment_id &&
    !data?.token &&
    !data?.success;

  if (!res.ok || isSoftError) {
    const message = data.message || data.error || data.errors || JSON.stringify(data) || `Shiprocket API error (${res.status})`;
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    err.shiprocketData = data;
    throw err;
  }

  return data;
};

export const getAuthToken = async () => {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const { email, password } = getShiprocketConfig();
  if (!email || !password) {
    throw new Error('Shiprocket API credentials are not configured. Set SHIP_ROCKET_API_EMAIL and SHIP_ROCKET_API_PASSWORD.');
  }

  const res = await fetch(buildShiprocketUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    const message = data.message || 'Failed to authenticate with Shiprocket';
    if (message.toLowerCase().includes('blocked') || message.toLowerCase().includes('failed login')) {
      throw new Error(
        `${message}. Regenerate the API password in Shiprocket → Settings → API Users, update SHIP_ROCKET_API_PASSWORD in .env, wait 15 minutes, then restart the server.`
      );
    }
    if (message.toLowerCase().includes('invalid') || res.status === 401) {
      throw new Error(
        `${message}. Verify SHIP_ROCKET_API_EMAIL and SHIP_ROCKET_API_PASSWORD match your Shiprocket API user exactly.`
      );
    }
    throw new Error(message);
  }

  cachedToken = data.token;
  tokenExpiresAt = Date.now() + getTokenTtlMs();
  return cachedToken;
};

const calculatePackageDetails = (orderItems, productsById = {}) => {
  let totalWeight = 0;
  let maxLength = 10;
  let maxBreadth = 10;
  let maxHeight = 10;

  for (const item of orderItems) {
    const product = productsById[item.product?.toString?.() || item.product] || {};
    const itemWeight = product.weight || 0.5;
    totalWeight += itemWeight * item.quantity;
    maxLength = Math.max(maxLength, product.length || 10);
    maxBreadth = Math.max(maxBreadth, product.breadth || 10);
    maxHeight = Math.max(maxHeight, product.height || 10);
  }

  return {
    weight: Math.max(0.5, Number(totalWeight.toFixed(2))),
    length: maxLength,
    breadth: maxBreadth,
    height: maxHeight,
  };
};

export const checkServiceability = async ({ deliveryPincode, weight, isCOD, declaredValue }) => {
  const { pickupPincode } = getShiprocketConfig();
  const params = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: String(deliveryPincode),
    weight: String(weight),
    cod: isCOD ? '1' : '0',
    declared_value: String(declaredValue || 0),
  });

  return shiprocketFetch(`/courier/serviceability/?${params.toString()}`, { method: 'GET' });
};

/** Total charge aligned with Shiprocket panel (rate + whatsapp + surge + other fees). */
export const getCourierDeliveredCharge = (courier = {}) => {
  const baseRate = Number(courier.rate) || 0;
  const surgeCharges = Array.isArray(courier.surge)
    ? courier.surge.reduce((sum, item) => sum + (Number(item.charge) || 0), 0)
    : 0;

  const total =
    baseRate +
    (Number(courier.whatsapp_charges) || 0) +
    surgeCharges +
    (Number(courier.coverage_charges) || 0) +
    (Number(courier.other_charges) || 0) +
    (Number(courier.entry_tax) || 0);

  return Number(total.toFixed(2));
};

const mapCourierQuote = (courier) => {
  const baseRate = Number(courier.rate) || 0;
  const totalCharge = getCourierDeliveredCharge(courier);
  const surgeCharges = Array.isArray(courier.surge)
    ? courier.surge.reduce((sum, item) => sum + (Number(item.charge) || 0), 0)
    : 0;

  return {
    id: courier.courier_company_id,
    name: courier.courier_name,
    etd: courier.etd,
    baseRate,
    whatsappCharges: Number(courier.whatsapp_charges) || 0,
    surgeCharges,
    freightCharge: Number(courier.freight_charge) || 0,
    codCharges: Number(courier.cod_charges) || 0,
    totalCharge,
    rate: totalCharge,
  };
};

const pickCheapestCourier = (couriers = []) =>
  [...couriers].sort((a, b) => getCourierDeliveredCharge(a) - getCourierDeliveredCharge(b))[0];

export const getShippingRate = async ({ deliveryPincode, itemsPrice, paymentMethod, orderItems, productsById }) => {
  const freeShippingThreshold = getFreeShippingThreshold();
  const isFreeShipping = isFreeShippingEligible(itemsPrice, freeShippingThreshold);
  if (isFreeShipping) {
    return {
      itemsPrice,
      shippingPrice: 0,
      isShippingFree: true,
      freeShippingThreshold,
      courier: null,
      couriers: [],
    };
  }

  const { weight } = calculatePackageDetails(orderItems, productsById);
  const serviceability = await checkServiceability({
    deliveryPincode,
    weight,
    isCOD: paymentMethod === 'COD',
    declaredValue: itemsPrice,
  });

  const couriers = serviceability?.data?.available_courier_companies || [];
  if (!couriers.length) {
    throw new Error('No courier service available for this pincode');
  }

  const cheapest = pickCheapestCourier(couriers);
  const quote = mapCourierQuote(cheapest);

  return {
    itemsPrice,
    shippingPrice: quote.totalCharge,
    isShippingFree: false,
    freeShippingThreshold,
    courier: quote,
    couriers: couriers.map(mapCourierQuote),
  };
};

const splitName = (fullName = '') => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || 'Customer',
    lastName: parts.slice(1).join(' ') || '.',
  };
};

const normalizePhone = (phone = '') => {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
};

const toShiprocketNumber = (value) => {
  const num = Number(String(value).replace(/\D/g, ''));
  return Number.isNaN(num) ? 0 : num;
};

const formatShiprocketOrderDate = (date) => {
  const d = new Date(date || Date.now());
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const getPickupLocations = async () => {
  const response = await shiprocketFetch('/settings/company/pickup', { method: 'GET' });
  const locations = response?.data?.shipping_address || response?.data || response?.shipping_address || [];
  return Array.isArray(locations) ? locations : [];
};

const extractPickupLocationsFromError = (error) => {
  const nested = error?.shiprocketData?.data?.data || error?.shiprocketData?.data || [];
  return Array.isArray(nested) ? nested : [];
};

export const resolveActivePickupLocation = async () => {
  if (cachedPickupLocation) return cachedPickupLocation;

  const config = getShiprocketConfig();

  try {
    const locations = await getPickupLocations();
    if (locations.length > 0) {
      const exact = locations.find(
        (loc) => String(loc.pickup_location || '').toLowerCase() === config.pickupLocation.toLowerCase()
      );
      const primary = locations.find((loc) => loc.is_primary_location === 1);
      const chosen = exact || primary || locations[0];

      if (chosen?.pickup_location) {
        cachedPickupLocation = chosen.pickup_location;
        if (!exact && config.pickupLocation !== cachedPickupLocation) {
          console.warn(
            `Shiprocket pickup: env has "${config.pickupLocation}" but account uses "${cachedPickupLocation}". ` +
            `Set SHIP_ROCKET_PICKUP_LOCATION=${cachedPickupLocation} in .env`
          );
        }
        return cachedPickupLocation;
      }
    }
  } catch (error) {
    console.warn('Could not fetch Shiprocket pickup locations:', error.message);
  }

  cachedPickupLocation = config.pickupLocation;
  return cachedPickupLocation;
};

export const addPickupLocation = async (config = getShiprocketConfig()) => {
  const payload = {
    pickup_location: config.pickupLocation,
    name: config.pickupName || 'Rakaarituals',
    email: config.pickupEmail || config.email,
    phone: normalizePhone(config.pickupPhone),
    address: config.pickupAddress,
    address_2: config.pickupAddress2 || '',
    city: config.pickupCity,
    state: config.pickupState,
    country: config.pickupCountry || 'India',
    pin_code: config.pickupPincode,
  };

  if (!payload.email || !payload.phone || !payload.address || !payload.pin_code) {
    throw new Error(
      'Warehouse pickup address is incomplete. Set SHIP_ROCKET_PICKUP_NAME, SHIP_ROCKET_PICKUP_ADDRESS, ' +
      'SHIP_ROCKET_PICKUP_CITY, SHIP_ROCKET_PICKUP_STATE, SHIP_ROCKET_PICKUP_PHONE, SHIP_ROCKET_PICKUP_EMAIL, ' +
      'and SHIP_ROCKET_PICKUP_PINCODE in your .env file.'
    );
  }

  return shiprocketFetch('/settings/company/addpickup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const ensurePickupLocation = async () => {
  const resolved = await resolveActivePickupLocation();
  const config = getShiprocketConfig();

  if (!isAutoRegisterPickupEnabled()) {
    return resolved;
  }

  const locations = await getPickupLocations();
  const exists = locations.some(
    (loc) => String(loc.pickup_location || '').toLowerCase() === resolved.toLowerCase()
  );

  if (exists) return resolved;

  await addPickupLocation({ ...config, pickupLocation: resolved });
  return resolved;
};

export const getChannelOrderId = (order) => `RAKA-${order._id.toString().slice(-12).toUpperCase()}`;

const parseCreateOrderResponse = (response = {}) => {
  const candidates = [
    response,
    response?.payload,
    response?.data,
    response?.response,
    response?.response?.data,
  ].filter(Boolean);

  for (const src of candidates) {
    const orderId = src.order_id ?? src.sr_order_id ?? src.id ?? null;
    let shipmentId = src.shipment_id ?? src.shipmentId ?? null;

    const shipments = src.shipments || src.shipment;
    if (!shipmentId && Array.isArray(shipments) && shipments.length > 0) {
      shipmentId = shipments[0].id ?? shipments[0].shipment_id ?? null;
    }

    if (orderId || shipmentId) {
      return { orderId, shipmentId };
    }
  }

  return { orderId: null, shipmentId: null };
};

export const searchOrderByChannelId = async (channelOrderId) => {
  const response = await shiprocketFetch(
    `/orders?search=${encodeURIComponent(channelOrderId)}&per_page=5`,
    { method: 'GET' }
  );
  const orders = response?.data || response?.orders || [];
  return Array.isArray(orders) ? orders[0] : null;
};

export const getOrderDetails = async (shiprocketOrderId) => {
  return shiprocketFetch(`/orders/show/${shiprocketOrderId}`, { method: 'GET' });
};

const extractShipmentFromOrderData = (data = {}) => {
  if (!data) return null;

  let shipmentId = data.shipment_id ?? data.shipmentId ?? null;
  const orderId = data.id ?? data.order_id ?? data.sr_order_id ?? null;

  const shipments = data.shipments || data.shipment;
  if (!shipmentId && Array.isArray(shipments) && shipments.length > 0) {
    shipmentId = shipments[0].id ?? shipments[0].shipment_id ?? null;
  }

  if (!shipmentId) return null;
  return { orderId, shipmentId };
};

const resolveShipmentFromOrder = async (shiprocketOrderId, channelOrderId) => {
  if (shiprocketOrderId) {
    try {
      const details = await getOrderDetails(shiprocketOrderId);
      const resolved = extractShipmentFromOrderData(details?.data || details);
      if (resolved?.shipmentId) return resolved;
    } catch (error) {
      console.warn('Could not fetch Shiprocket order details:', error.message);
    }
  }

  if (channelOrderId) {
    const found = await searchOrderByChannelId(channelOrderId);
    const resolved = extractShipmentFromOrderData(found);
    if (resolved?.shipmentId) return resolved;
  }

  return null;
};

export const buildAdhocOrderPayload = (order, userEmail, productsById = {}, pickupLocation) => {
  const pickup = pickupLocation || getShiprocketConfig().pickupLocation;
  const { firstName, lastName } = splitName(order.shippingAddress.fullName);
  const packageDetails = calculatePackageDetails(order.orderItems, productsById);
  const paymentMethod = order.paymentMethod === 'COD' ? 'COD' : 'Prepaid';
  const billingPhone = toShiprocketNumber(normalizePhone(order.shippingAddress.phone));
  const billingPincode = toShiprocketNumber(order.shippingAddress.postalCode);

  const order_items = order.orderItems.map((item, index) => {
    const product = productsById[item.product?.toString?.() || item.product] || {};
    return {
      name: item.name,
      sku: product.sku || `RAKA-${item.product?.toString?.()?.slice(-6) || index}`,
      units: item.quantity,
      selling_price: item.price,
      discount: '',
      tax: '',
      hsn: product.hsnCode || 33049990,
    };
  });

  const sub_total = order_items.reduce((sum, item) => sum + item.units * item.selling_price, 0);

  const payload = {
    order_id: getChannelOrderId(order),
    order_date: formatShiprocketOrderDate(order.createdAt),
    pickup_location: pickup,
    comment: `Rakaarituals order ${order._id.toString().slice(-8)}`,
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: [order.shippingAddress.houseFlatNo, order.shippingAddress.streetArea]
      .filter(Boolean)
      .join(', ') || order.shippingAddress.addressLine,
    billing_address_2: order.shippingAddress.landmark || '',
    billing_city: order.shippingAddress.city,
    billing_pincode: billingPincode,
    billing_state: order.shippingAddress.state,
    billing_country: order.shippingAddress.country || 'India',
    billing_email: userEmail || getShiprocketConfig().email || 'orders@rakaarituals.com',
    billing_phone: billingPhone,
    shipping_is_billing: true,
    shipping_customer_name: '',
    shipping_last_name: '',
    shipping_address: '',
    shipping_address_2: '',
    shipping_city: '',
    shipping_pincode: '',
    shipping_country: '',
    shipping_state: '',
    shipping_email: '',
    shipping_phone: '',
    order_items,
    payment_method: paymentMethod,
    shipping_charges: order.shippingPrice || 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total,
    length: packageDetails.length,
    breadth: packageDetails.breadth,
    height: packageDetails.height,
    weight: packageDetails.weight,
  };

  if (paymentMethod === 'COD') {
    payload.cod_amount = order.totalPrice;
  }

  return payload;
};

export const createAdhocOrder = async (payload) => {
  return shiprocketFetch('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const createShiprocketOrder = async (order, userEmail, productsById = {}) => {
  if (!order.shippingAddress?.postalCode || !order.shippingAddress?.addressLine) {
    throw new Error('Order is missing customer shipping address.');
  }

  const channelOrderId = getChannelOrderId(order);

  if (order.shiprocketOrderId) {
    const resolved = await resolveShipmentFromOrder(order.shiprocketOrderId, channelOrderId);
    return {
      shiprocketOrderId: order.shiprocketOrderId,
      shipmentId: resolved?.shipmentId || order.shiprocketShipmentId || null,
      channelOrderId,
      alreadyExists: true,
    };
  }

  const pickupLocation = await ensurePickupLocation();
  let payload = buildAdhocOrderPayload(order, userEmail, productsById, pickupLocation);

  let createResponse;
  try {
    createResponse = await createAdhocOrder(payload);
  } catch (error) {
    if (error.message?.toLowerCase().includes('wrong pickup location')) {
      const fromError = extractPickupLocationsFromError(error);
      const fallback = fromError[0]?.pickup_location;
      if (fallback && fallback !== payload.pickup_location) {
        cachedPickupLocation = fallback;
        payload = buildAdhocOrderPayload(order, userEmail, productsById, fallback);
        createResponse = await createAdhocOrder(payload);
      } else {
        throw new Error(
          `Wrong pickup location "${payload.pickup_location}". ` +
          `Your Shiprocket account has: ${fromError.map((l) => l.pickup_location).join(', ') || 'none'}. ` +
          `Set SHIP_ROCKET_PICKUP_LOCATION=warehouse in .env`
        );
      }
    } else if (error.message?.toLowerCase().includes('billing/shipping address')) {
      throw new Error(
        `Pickup location "${payload.pickup_location}" not found in Shiprocket. ` +
        'Add it under Settings → Pickup Addresses.'
      );
    } else {
      const resolved = await resolveShipmentFromOrder(null, channelOrderId);
      if (resolved?.orderId) {
        return {
          shiprocketOrderId: String(resolved.orderId),
          shipmentId: resolved.shipmentId ? String(resolved.shipmentId) : null,
          channelOrderId,
          alreadyExists: true,
        };
      }
      throw error;
    }
  }

  const parsed = parseCreateOrderResponse(createResponse);
  let shiprocketOrderId = parsed.orderId;
  let shipmentId = parsed.shipmentId;

  if (!shipmentId || !shiprocketOrderId) {
    const resolved = await resolveShipmentFromOrder(shiprocketOrderId, channelOrderId);
    if (resolved) {
      shiprocketOrderId = resolved.orderId || shiprocketOrderId;
      shipmentId = resolved.shipmentId || shipmentId;
    }
  }

  if (!shiprocketOrderId) {
    throw new Error(
      `Shiprocket did not return an order ID for ${channelOrderId}. ` +
      'Check pickup location matches your Shiprocket panel (e.g. warehouse).'
    );
  }

  return {
    shiprocketOrderId: String(shiprocketOrderId),
    shipmentId: shipmentId ? String(shipmentId) : null,
    channelOrderId,
    alreadyExists: false,
  };
};

export const syncOrderToShiprocket = async (order, userEmail, productsById = {}) => {
  if (!isShiprocketConfigured()) {
    return { synced: false, reason: 'Shiprocket API not configured' };
  }

  const result = await createShiprocketOrder(order, userEmail, productsById);
  return { synced: true, ...result };
};

/** Cancel one or more Shiprocket orders by their numeric order IDs. @see https://apidocs.shiprocket.in/ */
export const cancelShiprocketOrders = async (orderIds) => {
  const ids = (Array.isArray(orderIds) ? orderIds : [orderIds])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  if (!ids.length) {
    throw new Error('At least one valid Shiprocket order ID is required to cancel.');
  }

  return shiprocketFetch('/orders/cancel', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const cancelOrderOnShiprocket = async (order) => {
  if (!isShiprocketConfigured() || !order) {
    return { cancelled: false, reason: 'Shiprocket API not configured' };
  }

  if (order.shiprocketCancelledAt) {
    return { cancelled: false, reason: 'Already cancelled in Shiprocket', alreadyCancelled: true };
  }

  const shiprocketOrderId = order.shiprocketOrderId;
  if (!shiprocketOrderId) {
    return { cancelled: false, reason: 'Order was never synced to Shiprocket' };
  }

  const response = await cancelShiprocketOrders(shiprocketOrderId);
  return {
    cancelled: true,
    shiprocketOrderId: String(shiprocketOrderId),
    message: response?.message || 'Order cancelled in Shiprocket',
    response,
  };
};

export const assignAWB = async ({ shipmentId, courierId }) => {
  return shiprocketFetch('/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId, courier_id: courierId }),
  });
};

export const generatePickup = async (shipmentId) => {
  return shiprocketFetch('/courier/generate/pickup', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
};

export const generateManifest = async (shipmentId) => {
  return shiprocketFetch('/manifests/generate', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
};

export const printManifest = async (orderIds) => {
  return shiprocketFetch('/manifests/print', {
    method: 'POST',
    body: JSON.stringify({ order_ids: orderIds }),
  });
};

export const generateLabel = async (shipmentId) => {
  return shiprocketFetch('/courier/generate/label', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
};

export const printInvoice = async (orderIds) => {
  const ids = (Array.isArray(orderIds) ? orderIds : [orderIds]).map((id) => String(id));
  return shiprocketFetch('/orders/print/invoice', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
};

export const extractInvoiceUrl = (response = {}) =>
  response?.invoice_url ||
  response?.url ||
  response?.response?.invoice_url ||
  response?.data?.invoice_url ||
  (Array.isArray(response?.data) ? response.data[0]?.invoice_url : null) ||
  null;

export const extractManifestUrl = (response = {}) =>
  response?.manifest_url ||
  response?.url ||
  response?.response?.manifest_url ||
  response?.data?.manifest_url ||
  null;

export const fetchOrderInvoice = async (order) => {
  const shiprocketOrderId = order.shiprocketOrderId;
  if (!shiprocketOrderId) {
    throw new Error('Order is not synced to Shiprocket yet.');
  }

  const response = await printInvoice([shiprocketOrderId]);
  const invoiceUrl = extractInvoiceUrl(response);
  if (!invoiceUrl) {
    throw new Error('Shiprocket did not return an invoice URL. Ship the order first, then retry.');
  }

  return { invoiceUrl, raw: response };
};

export const fetchOrderManifest = async (order) => {
  const shiprocketOrderId = order.shiprocketOrderId;
  if (!shiprocketOrderId) {
    throw new Error('Order is not synced to Shiprocket yet.');
  }

  if (order.shiprocketShipmentId) {
    await generateManifest(order.shiprocketShipmentId);
  }

  const response = await printManifest([shiprocketOrderId]);
  const manifestUrl = extractManifestUrl(response);
  if (!manifestUrl) {
    throw new Error('Shiprocket did not return a manifest URL. Ship the order first, then retry.');
  }

  return { manifestUrl, raw: response };
};

export const trackByAWB = async (awbCode) => {
  return shiprocketFetch(`/courier/track/awb/${awbCode}`, { method: 'GET' });
};

/** @see https://apidocs.shiprocket.in/ — POST /courier/track/awbs */
export const trackByAWBs = async (awbCodes) => {
  const awbs = (Array.isArray(awbCodes) ? awbCodes : [awbCodes]).filter(Boolean);
  if (!awbs.length) throw new Error('At least one AWB code is required.');
  return shiprocketFetch('/courier/track/awbs', {
    method: 'POST',
    body: JSON.stringify({ awbs }),
  });
};

/** @see https://apidocs.shiprocket.in/ — GET /courier/track?order_id=&channel_id= */
export const trackByOrderAndChannel = async ({ orderId, channelId }) => {
  const params = new URLSearchParams();
  if (orderId) params.set('order_id', String(orderId));
  if (channelId) params.set('channel_id', String(channelId));
  return shiprocketFetch(`/courier/track?${params.toString()}`, { method: 'GET' });
};

/** @see https://apidocs.shiprocket.in/ — GET /courier/track/shipment/{shipment_id} */
export const trackByShipmentId = async (shipmentId) => {
  return shiprocketFetch(`/courier/track/shipment/${shipmentId}`, { method: 'GET' });
};

export const generateAWBForShipment = async ({ shipmentId, courierId }) => {
  const response = await assignAWB({ shipmentId, courierId });
  const data = response?.response?.data || response?.data || response;

  return {
    awbCode: data?.awb_code || response?.awb_code || null,
    courierName: data?.courier_name || response?.courier_name || null,
    courierId: data?.courier_company_id || courierId || null,
    trackingUrl: null,
    raw: response,
  };
};

export const generateAWBForOrder = async (order, productsById = {}) => {
  const shipmentId = order.shiprocketShipmentId;
  if (!shipmentId) {
    throw new Error('Order has no Shiprocket shipment ID. Sync the order to Shiprocket first.');
  }

  const courierId = await pickCourierId(order, productsById);
  const awb = await generateAWBForShipment({ shipmentId, courierId });

  if (!awb.awbCode) {
    throw new Error('Shiprocket did not return an AWB code. Check wallet balance and courier availability.');
  }

  return { shipmentId: String(shipmentId), courierId, ...awb };
};

/** Track by RAKA channel order id — matches branded page search (order_id=RAKA-xxx) */
export const trackByChannelOrderId = async (channelOrderId) => {
  const { channelId } = getShiprocketConfig();
  return trackByOrderAndChannel({
    orderId: channelOrderId,
    channelId: channelId || undefined,
  });
};

export const fetchLiveTracking = async (order) => {
  if (order.awbCode) {
    return { source: 'awb', data: await trackByAWB(order.awbCode) };
  }

  const shipmentId = order.shiprocketShipmentId;
  if (shipmentId) {
    return { source: 'shipment', data: await trackByShipmentId(shipmentId) };
  }

  const channelOrderId = order.shiprocketChannelOrderId || getChannelOrderId(order);
  if (channelOrderId) {
    return {
      source: 'channel_order',
      data: await trackByChannelOrderId(channelOrderId),
    };
  }

  const shiprocketOrderId = order.shiprocketOrderId;
  if (shiprocketOrderId) {
    const { channelId } = getShiprocketConfig();
    return {
      source: 'order',
      data: await trackByOrderAndChannel({ orderId: shiprocketOrderId, channelId }),
    };
  }

  return null;
};

export const pickCourierId = async (order, productsById) => {
  if (order.courierId) return order.courierId;

  const itemsPrice = order.itemsPrice ?? order.totalPrice;
  const { weight } = calculatePackageDetails(order.orderItems, productsById);
  const serviceability = await checkServiceability({
    deliveryPincode: order.shippingAddress.postalCode,
    weight,
    isCOD: order.paymentMethod === 'COD',
    declaredValue: itemsPrice,
  });

  const couriers = serviceability?.data?.available_courier_companies || [];
  if (!couriers.length) {
    throw new Error('No courier available for this shipment');
  }

  const cheapest = pickCheapestCourier(couriers);
  return cheapest.courier_company_id;
};

export const createFullShipment = async (order, userEmail, productsById = {}) => {
  const srOrder = await runShiprocketStep('create or fetch order', () =>
    createShiprocketOrder(order, userEmail, productsById)
  );

  let shiprocketOrderId = srOrder.shiprocketOrderId;
  let shipmentId = srOrder.shipmentId || order.shiprocketShipmentId || null;

  if (!shipmentId) {
    const resolved = await runShiprocketStep('fetch shipment details', () =>
      resolveShipmentFromOrder(shiprocketOrderId, srOrder.channelOrderId)
    );
    if (resolved?.shipmentId) {
      shiprocketOrderId = resolved.orderId || shiprocketOrderId;
      shipmentId = resolved.shipmentId;
    }
  }

  if (!shipmentId) {
    const err = new Error(
      `Order exists in Shiprocket (id: ${shiprocketOrderId}) but has no shipment yet. ` +
      'Open Shiprocket → Orders, verify the order, then click Ship via Shiprocket again.'
    );
    err.shiprocketOrderId = String(shiprocketOrderId);
    throw err;
  }

  const courierId = await runShiprocketStep('check courier serviceability', () =>
    pickCourierId(order, productsById)
  );
  const awbResponse = await runShiprocketStep('assign AWB', () =>
    assignAWB({ shipmentId, courierId })
  );

  await runShiprocketStep('schedule pickup', () => generatePickup(shipmentId));
  await runShiprocketStep('generate manifest', () => generateManifest(shipmentId));

  let manifestUrl = null;
  try {
    const manifestPrint = await runShiprocketStep('print manifest', () =>
      printManifest([shiprocketOrderId])
    );
    manifestUrl = extractManifestUrl(manifestPrint);
  } catch (err) {
    console.warn('Shiprocket manifest print failed:', err.message);
  }

  let labelUrl = null;
  try {
    const labelResponse = await runShiprocketStep('generate label', () =>
      generateLabel(shipmentId)
    );
    labelUrl = labelResponse?.label_url || labelResponse?.response?.data || null;
  } catch (err) {
    console.warn('Shiprocket label generation failed:', err.message);
  }

  let invoiceUrl = null;
  try {
    const invoiceResponse = await runShiprocketStep('print invoice', () =>
      printInvoice([shiprocketOrderId])
    );
    invoiceUrl = extractInvoiceUrl(invoiceResponse);
  } catch (err) {
    console.warn('Shiprocket invoice print failed:', err.message);
  }

  return {
    shiprocketOrderId,
    shipmentId,
    awbCode: awbResponse?.response?.data?.awb_code || awbResponse?.awb_code || null,
    courierName: awbResponse?.response?.data?.courier_name || awbResponse?.courier_name || null,
    courierId,
    labelUrl,
    manifestUrl,
    invoiceUrl,
    trackingUrl: null,
  };
};

export const parseTrackingResponse = (trackingData) => {
  const tracking = trackingData?.tracking_data || trackingData;
  const shipmentTrack = tracking?.shipment_track;
  const trackRow = Array.isArray(shipmentTrack) ? shipmentTrack[0] : shipmentTrack;
  const activities =
    tracking?.shipment_track_activities ||
    (Array.isArray(tracking?.track_status) ? tracking.track_status : tracking?.track_status) ||
    [];

  const history = Array.isArray(activities)
    ? activities.map((item) => ({
        date: item.date || item.activity_date || item['date-time'] || null,
        activity: item.activity || item.status || item['sr-status-label'] || 'Update',
        location: item.location || item['sr-status'] || '',
      }))
    : [];

  const currentStatus =
    trackRow?.current_status ||
    tracking?.shipment_status ||
    tracking?.current_status ||
    (typeof tracking?.track_status === 'string' ? tracking.track_status : null) ||
    null;

  const trackingUrl = tracking?.track_url || null;

  return { currentStatus, history, trackingUrl };
};

export { calculatePackageDetails };
