import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, firstValueFrom } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

export interface LocationResult {
  zipCode: string;
  city: string;
  state: string;
  country: string;
  source: 'gps' | 'ip' | 'fallback';
}

@Injectable({
  providedIn: 'root'
})
export class AutoZipCodeService {
  // Using multiple free APIs for redundancy
  private readonly NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/reverse';
  private readonly IPAPI_BASE = 'http://ip-api.com/json';

  constructor(private http: HttpClient) {}

  async getZipCodeFromLocation(): Promise<LocationResult | null> {
    try {
      // First try GPS-based location
      const gpsResult = await this.getZipCodeFromGPS();
      if (gpsResult) {
        return gpsResult;
      }
    } catch (error) {
      console.warn('GPS location failed:', error);
    }

    try {
      // Fallback to IP-based location
      const ipResult = await firstValueFrom(this.getZipCodeFromIP());
      if (ipResult) {
        return ipResult;
      }
    } catch (error) {
      console.warn('IP location failed:', error);
    }

    // Last resort: return a sensible default
    return this.getFallbackLocation();
  }

  private async getZipCodeFromGPS(): Promise<LocationResult | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const zipCode = await this.reverseGeocode(latitude, longitude);
            if (zipCode) {
              resolve(zipCode);
            } else {
              resolve(null);
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            resolve(null);
          }
        },
        (error) => {
          console.warn('GPS access denied or failed:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 600000 // 10 minutes
        }
      );
    });
  }

  private async reverseGeocode(lat: number, lon: number): Promise<LocationResult | null> {
    const url = `${this.NOMINATIM_BASE}?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    try {
      const response = await firstValueFrom(this.http.get<any>(url).pipe(
        timeout(5000),
        catchError(() => of(null))
      ));

      if (!response || !response.address) {
        return null;
      }

      const address = response.address;
      const zipCode = address.postcode || address.postal_code;
      
      if (!zipCode || !/^\d{5}$/.test(zipCode)) {
        return null;
      }

      return {
        zipCode: zipCode,
        city: address.city || address.town || address.village || 'Unknown',
        state: address.state || address.region || 'Unknown',
        country: address.country || 'US',
        source: 'gps' as const
      };
    } catch (error) {
      return null;
    }
  }

  private getZipCodeFromIP(): Observable<LocationResult | null> {
    return this.http.get<any>(`${this.IPAPI_BASE}?fields=status,zip,city,regionName,country`).pipe(
      timeout(5000),
      map(response => {
        if (!response || response.status !== 'success' || !response.zip) {
          return null;
        }

        // Validate ZIP code format (US 5-digit)
        if (!/^\d{5}$/.test(response.zip)) {
          return null;
        }

        return {
          zipCode: response.zip,
          city: response.city || 'Unknown',
          state: response.regionName || 'Unknown',
          country: response.country || 'US',
          source: 'ip' as const
        };
      }),
      catchError(() => of(null))
    );
  }

  private getFallbackLocation(): LocationResult {
    // Default to Birmingham, AL since that's mentioned in the context
    // Users can easily change this in the configuration
    return {
      zipCode: '35203',
      city: 'Birmingham',
      state: 'Alabama',
      country: 'US',
      source: 'fallback'
    };
  }

  // Get multiple fallback options based on common US cities
  getFallbackOptions(): LocationResult[] {
    return [
      { zipCode: '35203', city: 'Birmingham', state: 'AL', country: 'US', source: 'fallback' },
      { zipCode: '10001', city: 'New York', state: 'NY', country: 'US', source: 'fallback' },
      { zipCode: '90210', city: 'Beverly Hills', state: 'CA', country: 'US', source: 'fallback' },
      { zipCode: '60601', city: 'Chicago', state: 'IL', country: 'US', source: 'fallback' },
      { zipCode: '77001', city: 'Houston', state: 'TX', country: 'US', source: 'fallback' },
      { zipCode: '33101', city: 'Miami', state: 'FL', country: 'US', source: 'fallback' }
    ];
  }
}