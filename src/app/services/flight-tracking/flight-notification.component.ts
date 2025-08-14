import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, interval } from 'rxjs';
import { FlightTrackingService, NearbyFlight } from './flight-tracking.service';
import { GeolocationService, UserLocation } from './geolocation.service';

@Component({
  selector: 'app-flight-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flight-notifications" *ngIf="nearbyFlights.length > 0">
      <div class="notification-header">
        <h4>✈️ Aircraft Nearby</h4>
        <div class="location-status" *ngIf="userLocation">
          📍 Lat: {{userLocation.latitude | number:'1.4-4'}}, 
          Lon: {{userLocation.longitude | number:'1.4-4'}}
        </div>
      </div>
      
      <div class="flight-list">
        <div 
          *ngFor="let nearby of nearbyFlights" 
          class="flight-item"
          [class.overhead]="nearby.isOverhead">
          
          <div class="flight-info">
            <div class="callsign">
              {{nearby.flight.callsign || 'Unknown'}}
            </div>
            <div class="details">
              <span class="country">{{nearby.flight.origin_country}}</span>
              <span class="distance">{{nearby.distance | number:'1.1-1'}}km away</span>
            </div>
            <div class="flight-data" *ngIf="nearby.flight.velocity || nearby.flight.baro_altitude">
              <span *ngIf="nearby.flight.velocity" class="velocity">
                {{nearby.flight.velocity | number:'1.0-0'}} m/s
              </span>
              <span *ngIf="nearby.flight.baro_altitude" class="altitude">
                {{nearby.flight.baro_altitude}}m alt
              </span>
            </div>
            <div class="overhead-indicator" *ngIf="nearby.isOverhead">
              🎯 OVERHEAD!
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="location-error" *ngIf="locationError">
      ⚠️ Location access needed to track nearby flights
      <button class="btn-small" (click)="requestLocation()">Enable Location</button>
    </div>
  `,
  styles: [`
    .flight-notifications {
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #00ff00;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      color: #00ff00;
      font-family: monospace;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .notification-header {
      border-bottom: 1px solid #00ff00;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    
    .notification-header h4 {
      margin: 0 0 5px 0;
      color: #00ff00;
    }
    
    .location-status {
      font-size: 12px;
      color: #888;
    }
    
    .flight-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .flight-item {
      background: rgba(0, 255, 0, 0.1);
      border: 1px solid #00ff00;
      border-radius: 4px;
      padding: 10px;
      transition: all 0.3s ease;
    }
    
    .flight-item.overhead {
      background: rgba(255, 255, 0, 0.2);
      border-color: #ffff00;
      box-shadow: 0 0 10px rgba(255, 255, 0, 0.3);
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    
    .callsign {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 4px;
    }
    
    .details {
      display: flex;
      gap: 15px;
      font-size: 12px;
      margin-bottom: 4px;
    }
    
    .flight-data {
      display: flex;
      gap: 15px;
      font-size: 11px;
      color: #aaa;
    }
    
    .overhead-indicator {
      color: #ffff00;
      font-weight: bold;
      margin-top: 5px;
      animation: blink 1s infinite;
    }
    
    @keyframes blink {
      0%, 50% { opacity: 1; }
      51%, 100% { opacity: 0.3; }
    }
    
    .location-error {
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid #ff0000;
      border-radius: 4px;
      padding: 10px;
      color: #ff0000;
      text-align: center;
      margin: 10px 0;
    }
    
    .btn-small {
      background: #ff0000;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      margin-left: 10px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .btn-small:hover {
      background: #cc0000;
    }
  `]
})
export class FlightNotificationComponent implements OnInit, OnDestroy {
  nearbyFlights: NearbyFlight[] = [];
  userLocation: UserLocation | null = null;
  locationError = false;
  
  private subscriptions = new Subscription();

  constructor(
    private flightService: FlightTrackingService,
    private geoService: GeolocationService
  ) {}

  ngOnInit(): void {
    this.initializeFlightTracking();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.geoService.stopWatchingPosition();
  }

  private async initializeFlightTracking(): Promise<void> {
    // Subscribe to nearby flights
    this.subscriptions.add(
      this.flightService.nearbyFlights$.subscribe(flights => {
        this.nearbyFlights = flights;
      })
    );

    // Subscribe to user location
    this.subscriptions.add(
      this.geoService.userLocation$.subscribe(location => {
        this.userLocation = location;
        this.locationError = false;
      })
    );

    // Try to get location
    const location = await this.geoService.getCurrentPosition();
    if (!location) {
      this.locationError = true;
      return;
    }

    // Start watching location
    this.geoService.startWatchingPosition();

    // Check for flights every 30 seconds
    this.subscriptions.add(
      interval(30000).subscribe(() => {
        const currentLocation = this.geoService.getCurrentLocation();
        if (currentLocation) {
          this.flightService.checkForNearbyFlights(
            currentLocation.latitude,
            currentLocation.longitude
          );
        }
      })
    );

    // Initial flight check
    this.flightService.checkForNearbyFlights(location.latitude, location.longitude);
  }

  requestLocation(): void {
    this.geoService.getCurrentPosition().then(location => {
      if (location) {
        this.locationError = false;
        this.geoService.startWatchingPosition();
      }
    });
  }
}