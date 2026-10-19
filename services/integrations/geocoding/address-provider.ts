/**
 * Gyrex Labs - Provider-Independent Address Search & Geocoding Service
 *
 * Designed to cleanly decouple address lookup from specific external providers
 * (e.g. Google Places, Mappls).
 *
 * NOTE: As per architectural requirements, public Nominatim is NOT used as an
 * unrestricted commercial autocomplete service. When commercial credentials
 * (GOOGLE_MAPS_API_KEY or MAPPLS_API_KEY) are unconfigured, autocomplete status
 * is cleanly reported as "PROVIDER_CREDENTIALS_PENDING" and the checkout UI
 * immediately relies on verified manual entry, PIN confirmation, and browser GPS.
 */

export interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
  addressLine1?: string;
  locality?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface GeocodingProviderStatus {
  provider: "google" | "mappls" | "none";
  isConfigured: boolean;
  status: "ACTIVE" | "PROVIDER_CREDENTIALS_PENDING";
  message: string;
}

export function getAddressProviderStatus(): GeocodingProviderStatus {
  if (process.env.GOOGLE_MAPS_API_KEY) {
    return {
      provider: "google",
      isConfigured: true,
      status: "ACTIVE",
      message: "Google Places address provider active.",
    };
  }

  if (process.env.MAPPLS_API_KEY) {
    return {
      provider: "mappls",
      isConfigured: true,
      status: "ACTIVE",
      message: "Mappls (MapmyIndia) address provider active.",
    };
  }

  return {
    provider: "none",
    isConfigured: false,
    status: "PROVIDER_CREDENTIALS_PENDING",
    message:
      "Commercial address autocomplete provider is pending configuration. Manual address entry and browser GPS fallback are active.",
  };
}

/**
 * Searches for address suggestions using the active provider.
 * Returns an empty array if no commercial provider credentials are configured or if the query times out.
 */
export async function searchAddress(
  query: string,
  _cityBias?: string
): Promise<AddressSuggestion[]> {
  const status = getAddressProviderStatus();
  if (!status.isConfigured || !query || query.trim().length < 3) {
    return [];
  }

  // 1. Google Places Autocomplete Provider
  if (status.provider === "google") {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        query.trim()
      )}&components=country:in&key=${apiKey}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (data.status !== "OK" || !Array.isArray(data.predictions)) {
        return [];
      }

      return data.predictions.map((p: any) => ({
        placeId: p.place_id,
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || "",
      }));
    } catch {
      // Graceful fallback to manual entry on network error or timeout
      return [];
    }
  }

  // 2. Mappls (MapmyIndia) Autosuggest Provider
  if (status.provider === "mappls") {
    try {
      const apiKey = process.env.MAPPLS_API_KEY!;
      const url = `https://atlas.mappls.com/api/places/geocode?address=${encodeURIComponent(
        query.trim()
      )}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) return [];

      const data = await res.json();
      const items = Array.isArray(data.copResults) ? data.copResults : [];

      return items.map((item: any, idx: number) => ({
        placeId: item.eLoc || `mappls-${idx}`,
        description: item.formattedAddress || item.placeAddress || query,
        mainText: item.placeName || item.formattedAddress,
        secondaryText: [item.subLocality, item.city, item.pincode].filter(Boolean).join(", "),
        postalCode: item.pincode,
        city: item.city,
        state: item.state,
        latitude: item.latitude ? parseFloat(item.latitude) : undefined,
        longitude: item.longitude ? parseFloat(item.longitude) : undefined,
      }));
    } catch {
      return [];
    }
  }

  return [];
}

/**
 * Reverse-geocodes latitude/longitude coordinates into a suggested address and PIN code.
 */
export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number
): Promise<AddressSuggestion | null> {
  const status = getAddressProviderStatus();
  if (!status.isConfigured) {
    // No commercial provider credentials present; return null so patient manually confirms PIN and address
    return null;
  }

  if (status.provider === "google") {
    try {
      const apiKey = process.env.GOOGLE_MAPS_API_KEY!;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

      const res = await fetch(url, {
        signal: AbortSignal.timeout(3500),
      });

      if (!res.ok) return null;

      const data = await res.json();
      if (data.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0) {
        return null;
      }

      const topResult = data.results[0];
      let postalCode = "";
      let locality = "";
      let city = "";
      let state = "";

      for (const component of topResult.address_components || []) {
        const types: string[] = component.types || [];
        if (types.includes("postal_code")) postalCode = component.long_name;
        if (types.includes("sublocality") || types.includes("neighborhood")) locality = component.long_name;
        if (types.includes("locality")) city = component.long_name;
        if (types.includes("administrative_area_level_1")) state = component.long_name;
      }

      return {
        placeId: topResult.place_id,
        description: topResult.formatted_address,
        mainText: locality || city || "Current Location",
        secondaryText: topResult.formatted_address,
        postalCode: postalCode || undefined,
        locality: locality || undefined,
        city: city || undefined,
        state: state || undefined,
        latitude: lat,
        longitude: lng,
      };
    } catch {
      return null;
    }
  }

  return null;
}
