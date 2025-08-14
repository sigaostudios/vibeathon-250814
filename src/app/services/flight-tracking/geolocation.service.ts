import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private userLocationSubject = new BehaviorSubject<UserLocation | null>(null);
  public userLocation$ = this.userLocationSubject.asObservable();
  
  private watchId: number | null = null;

  constructor() {}

  async getCurrentPosition(): Promise<UserLocation | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser.');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: UserLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          this.userLocationSubject.next(location);
          resolve(location);
        },
        (error) => {
          console.error('Error getting user location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  startWatchingPosition(): void {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      return;
    }

    if (this.watchId !== null) {
      this.stopWatchingPosition();
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };
        this.userLocationSubject.next(location);
      },
      (error) => {
        console.error('Error watching user location:', error);
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 600000 // 10 minutes
      }
    );
  }

  stopWatchingPosition(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  getCurrentLocation(): UserLocation | null {
    return this.userLocationSubject.value;
  }
}