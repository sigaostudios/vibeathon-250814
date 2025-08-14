import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { StorageService } from '../../storage.service';
import { GameConfig } from '../../configuration/configuration.component';
import { EventBus } from '../../../game/EventBus';

export interface ZipCodeLocation {
  zipCode: string;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class ZipCodeLocationService {
  private userLocationSubject = new BehaviorSubject<ZipCodeLocation | null>(null);
  public userLocation$ = this.userLocationSubject.asObservable();

  // Using Zippopotam.us - a free postal code API
  private readonly ZIPCODE_API_BASE = 'https://api.zippopotam.us/us';

  constructor(
    private http: HttpClient,
    private storage: StorageService
  ) {
    this.loadLocationFromConfig();
    
    // Listen for ZIP code updates from configuration
    EventBus.on('zipcode-updated', (zipCode: string) => {
      if (zipCode) {
        this.getLocationFromZipCode(zipCode).subscribe();
      }
    });
  }

  private async loadLocationFromConfig(): Promise<void> {
    try {
      const config = await this.storage.getItem<GameConfig>('gameConfig');
      if (config?.zipCode) {
        this.getLocationFromZipCode(config.zipCode).subscribe();
      }
    } catch (error) {
      console.warn('Could not load zip code from config:', error);
    }
  }

  getLocationFromZipCode(zipCode: string): Observable<ZipCodeLocation | null> {
    if (!zipCode || zipCode.length !== 5) {
      return of(null);
    }

    const url = `${this.ZIPCODE_API_BASE}/${zipCode}`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (!response || !response.places || response.places.length === 0) {
          throw new Error('Invalid ZIP code response');
        }

        const place = response.places[0];
        const location: ZipCodeLocation = {
          zipCode: response['post code'],
          latitude: parseFloat(place.latitude),
          longitude: parseFloat(place.longitude),
          city: place['place name'],
          state: place['state abbreviation'],
          timestamp: Date.now()
        };

        console.log('🗺️ ZIP code location obtained:', {
          zipCode: location.zipCode,
          city: location.city,
          state: location.state,
          lat: location.latitude,
          lon: location.longitude
        });

        this.userLocationSubject.next(location);
        return location;
      }),
      catchError(error => {
        console.warn('ZIP code API failed, using fallback for:', zipCode, error.message);
        
        // Fallback to hardcoded major city coordinates for common ZIP codes
        const fallbackLocation = this.getFallbackLocation(zipCode);
        if (fallbackLocation) {
          console.log('✅ Using fallback location for ZIP code:', zipCode, fallbackLocation.city, fallbackLocation.state);
          this.userLocationSubject.next(fallbackLocation);
          return of(fallbackLocation);
        }
        
        console.error('❌ No fallback available for ZIP code:', zipCode);
        return of(null);
      })
    );
  }

  getCurrentLocation(): ZipCodeLocation | null {
    return this.userLocationSubject.value;
  }

  // Fallback locations for major cities if API fails
  private getFallbackLocation(zipCode: string): ZipCodeLocation | null {
    const fallbacks: { [key: string]: Omit<ZipCodeLocation, 'zipCode' | 'timestamp'> } = {
      '35203': { latitude: 33.5186, longitude: -86.8104, city: 'Birmingham', state: 'AL' },
      '10001': { latitude: 40.7505, longitude: -73.9934, city: 'New York', state: 'NY' },
      '90210': { latitude: 34.0901, longitude: -118.4065, city: 'Beverly Hills', state: 'CA' },
      '60601': { latitude: 41.8838, longitude: -87.6319, city: 'Chicago', state: 'IL' },
      '77001': { latitude: 29.7749, longitude: -95.3695, city: 'Houston', state: 'TX' },
      '85001': { latitude: 33.4484, longitude: -112.0740, city: 'Phoenix', state: 'AZ' },
      '19019': { latitude: 39.9526, longitude: -75.1652, city: 'Philadelphia', state: 'PA' },
      '78701': { latitude: 30.2672, longitude: -97.7431, city: 'Austin', state: 'TX' },
      '98101': { latitude: 47.6062, longitude: -122.3321, city: 'Seattle', state: 'WA' },
      '33101': { latitude: 25.7617, longitude: -80.1918, city: 'Miami', state: 'FL' }
    };

    const fallback = fallbacks[zipCode];
    if (fallback) {
      return {
        ...fallback,
        zipCode,
        timestamp: Date.now()
      };
    }

    return null;
  }

  // Update location when config changes
  updateLocationFromConfig(): void {
    this.loadLocationFromConfig();
  }
}