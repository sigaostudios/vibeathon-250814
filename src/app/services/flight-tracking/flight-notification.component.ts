import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { FlightTrackingService, NearbyFlight } from './flight-tracking.service';
import { ZipCodeLocationService, ZipCodeLocation } from './zipcode-location.service';
import { EventBus } from '../../../game/EventBus';

@Component({
  selector: 'app-flight-notification',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Flight Status Section - Always Visible -->
    <div class="flight-status-section">
      <div class="notification-header">
        <h4>✈️ Flight Tracking</h4>
        <div class="location-status" *ngIf="userLocation">
          📍 {{userLocation.city}}, {{userLocation.state}} ({{userLocation.zipCode}})
          <br><small>{{userLocation.latitude | number:'1.4-4'}}, {{userLocation.longitude | number:'1.4-4'}}</small>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div class="loading-status" *ngIf="isLoading">
        <div class="spinner">🔄</div>
        <span>{{loadingMessage}}</span>
      </div>

      <!-- Error Messages -->
      <div class="error-status" *ngIf="errorMessage">
        ⚠️ {{errorMessage}}
        <button class="retry-btn" (click)="retryFlightTracking()">Retry</button>
      </div>

      <!-- Debug Information -->
      <div class="debug-info" *ngIf="debugMessage">
        🔍 Debug: {{debugMessage}}
      </div>
      
      <!-- Manual Flight Check Button -->
      <div class="flight-check" style="margin: 10px 0;">
        <button class="flights-btn" (click)="checkFlightsAboveMe()" [disabled]="isLoading || locationError">
          🛩️ Flights Above Me
        </button>
        <button class="demo-btn" (click)="showDemoFlights()" [disabled]="isLoading">
          🎮 Demo Mode
        </button>
      </div>

      <!-- Flight Results -->
      <div class="flight-notifications" *ngIf="nearbyFlights.length > 0">
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
              <div class="flight-data">
                <span *ngIf="nearby.flight.velocity" class="velocity">
                  Speed: {{(nearby.flight.velocity * 2.237) | number:'1.0-0'}} mph
                </span>
                <span *ngIf="nearby.flight.baro_altitude" class="altitude">
                  Height: {{(nearby.flight.baro_altitude * 3.281 / 5280) | number:'1.1-1'}} miles
                </span>
              </div>
              <div class="overhead-indicator" *ngIf="nearby.isOverhead">
                🎯 OVERHEAD!
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Flights Found -->
      <div class="no-flights" *ngIf="!isLoading && !errorMessage && nearbyFlights.length === 0 && hasSearched">
        <div>No flights found within 10km.</div>
      </div>
      
      <!-- Location Error -->
      <div class="location-error" *ngIf="locationError">
        ⚠️ ZIP code required for flight tracking
        <a routerLink="/config" class="btn-small">Configure ZIP Code</a>
      </div>
    </div>
  `,
  styles: [`
    .flight-status-section {
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #00ff00;
      border-radius: 8px;
      padding: 15px;
      margin: 10px 0;
      color: #00ff00;
      font-family: monospace;
      min-height: 100px;
    }
    
    .loading-status {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #ffff00;
      margin: 10px 0;
      animation: pulse 1.5s infinite;
    }
    
    .spinner {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .error-status {
      color: #ff4444;
      margin: 10px 0;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .retry-btn {
      background: #ff4444;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .retry-btn:hover {
      background: #ff6666;
    }
    
    .flights-btn {
      background: #00ff00;
      color: #000;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      font-family: monospace;
      transition: all 0.2s;
    }
    
    .flights-btn:hover:not(:disabled) {
      background: #00dd00;
      transform: scale(1.05);
    }
    
    .flights-btn:disabled {
      background: #666;
      color: #999;
      cursor: not-allowed;
      transform: none;
    }
    
    .demo-btn {
      background: #ffaa00;
      color: #000;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: bold;
      font-family: monospace;
      margin-left: 10px;
      transition: all 0.2s;
    }
    
    .demo-btn:hover:not(:disabled) {
      background: #ff9900;
      transform: scale(1.05);
    }
    
    .demo-btn:disabled {
      background: #666;
      color: #999;
      cursor: not-allowed;
      transform: none;
    }
    
    .debug-info {
      color: #888;
      font-size: 12px;
      margin: 5px 0;
    }
    
    .no-flights {
      color: #888;
      text-align: center;
      padding: 20px;
      font-style: italic;
    }
    
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
  userLocation: ZipCodeLocation | null = null;
  locationError = false;
  isLoading = false;
  loadingMessage = '';
  errorMessage = '';
  debugMessage = '';
  hasSearched = false;
  nextCheckMinutes = 2;
  
  private subscriptions = new Subscription();

  constructor(
    private flightService: FlightTrackingService,
    private zipLocationService: ZipCodeLocationService
  ) {}

  ngOnInit(): void {
    this.initializeFlightTracking();
    
    // Listen for event to clear flight tracking UI when all planes are done
    EventBus.on('clear-flight-tracking-ui', this.clearFlightTrackingUI, this);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    EventBus.off('clear-flight-tracking-ui', this.clearFlightTrackingUI, this);
  }
  
  private clearFlightTrackingUI(): void {
    this.nearbyFlights = [];
    this.hasSearched = false;
    this.debugMessage = 'All flights have finished crossing the screen';
  }

  private async initializeFlightTracking(): Promise<void> {
    this.debugMessage = 'Initializing flight tracking...';
    
    // Subscribe to nearby flights
    this.subscriptions.add(
      this.flightService.nearbyFlights$.subscribe(flights => {
        this.isLoading = false;
        this.nearbyFlights = flights;
        this.hasSearched = true;
        this.debugMessage = `Found ${flights.length} flights`;
        
        if (flights.length === 0 && this.hasSearched) {
          // Only clear error if we actually searched and found nothing
          // Don't clear if this was triggered by an error response
        }
        
        // Emit overhead flights to the game
        const overheadFlights = flights.filter(f => f.isOverhead);
        if (overheadFlights.length > 0) {
          this.emitOverheadFlightsToGame(overheadFlights);
        } else {
          // Clear any existing flight display when no overhead flights
          EventBus.emit('clear-overhead-flights');
        }
      })
    );

    // Subscribe to zip code location
    this.subscriptions.add(
      this.zipLocationService.userLocation$.subscribe(location => {
        this.userLocation = location;
        this.locationError = !location;
        
        if (location) {
          this.debugMessage = `Location found: ${location.city}, ${location.state}`;
          this.errorMessage = '';
        } else {
          this.debugMessage = 'No location available';
        }
        
        // Don't auto-search anymore - wait for button click
      })
    );

    // Check if we already have a location from config
    const currentLocation = this.zipLocationService.getCurrentLocation();
    if (currentLocation) {
      this.debugMessage = 'Location loaded from config. Click "Flights Above Me" to search.';
    } else {
      this.locationError = true;
      this.debugMessage = 'No location found in config';
    }
  }

  private performFlightSearch(location: ZipCodeLocation): void {
    this.isLoading = true;
    this.loadingMessage = 'Searching for nearby flights...';
    this.errorMessage = '';
    this.debugMessage = `Searching flights near ${location.city}...`;
    
    // Set a timeout to detect if the service doesn't respond
    const timeoutId = setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.errorMessage = 'OpenSky API rate limit reached. Try Demo Mode or wait until tomorrow.';
        this.debugMessage = 'API request timed out or blocked';
      }
    }, 10000); // 10 second timeout
    
    // Subscribe to detect when the response comes back
    const originalFlights = this.nearbyFlights.length;
    const subscription = this.flightService.nearbyFlights$.subscribe(flights => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    });
    
    try {
      this.flightService.checkForNearbyFlights(location.latitude, location.longitude);
    } catch (error) {
      clearTimeout(timeoutId);
      this.isLoading = false;
      this.errorMessage = 'Failed to search for flights';
      this.debugMessage = `Error: ${error}`;
    }
  }

  retryFlightTracking(): void {
    const currentLocation = this.zipLocationService.getCurrentLocation();
    if (currentLocation) {
      this.performFlightSearch(currentLocation);
    } else {
      this.errorMessage = 'No location available for search';
    }
  }

  checkFlightsAboveMe(): void {
    const currentLocation = this.zipLocationService.getCurrentLocation();
    if (currentLocation) {
      this.performFlightSearch(currentLocation);
    } else {
      this.errorMessage = 'No location available for search';
      this.debugMessage = 'Please configure your ZIP code in settings';
    }
  }

  showDemoFlights(): void {
    this.isLoading = true;
    this.loadingMessage = 'Loading demo flights...';
    this.errorMessage = '';
    this.debugMessage = 'Showing demo flight data';
    
    // Simulate API delay
    setTimeout(() => {
      // Pool of possible demo flights with varied speeds and altitudes
      const flightPool = [
        { icao24: 'a12345', callsign: 'DL1234', origin_country: 'United States', baro_altitude: 10668, velocity: 223, distance: 8.5 },
        { icao24: 'b67890', callsign: 'AA5678', origin_country: 'United States', baro_altitude: 6096, velocity: 134, distance: 5.2 },
        { icao24: 'c11111', callsign: 'SW2468', origin_country: 'United States', baro_altitude: 12192, velocity: 201, distance: 7.8 },
        { icao24: 'd22222', callsign: 'UA9876', origin_country: 'United States', baro_altitude: 3048, velocity: 178, distance: 3.1 },
        { icao24: 'e33333', callsign: 'BA0007', origin_country: 'United Kingdom', baro_altitude: 11582, velocity: 267, distance: 9.2 },
        { icao24: 'f44444', callsign: 'LH4815', origin_country: 'Germany', baro_altitude: 8534, velocity: 189, distance: 6.7 },
        { icao24: 'g55555', callsign: 'AF1623', origin_country: 'France', baro_altitude: 9144, velocity: 245, distance: 8.1 },
        { icao24: 'h66666', callsign: 'JAL421', origin_country: 'Japan', baro_altitude: 13716, velocity: 234, distance: 9.8 },
        { icao24: 'i77777', callsign: 'AC2580', origin_country: 'Canada', baro_altitude: 4572, velocity: 156, distance: 4.3 },
        { icao24: 'j88888', callsign: 'QF1474', origin_country: 'Australia', baro_altitude: 10363, velocity: 278, distance: 8.9 }
      ];
      
      // Randomly select 2-5 flights
      const numFlights = Math.floor(Math.random() * 4) + 2;
      const selectedFlights = [];
      const usedIndices = new Set();
      
      for (let i = 0; i < numFlights; i++) {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * flightPool.length);
        } while (usedIndices.has(randomIndex));
        
        usedIndices.add(randomIndex);
        const template = flightPool[randomIndex];
        
        selectedFlights.push({
          flight: {
            icao24: template.icao24,
            callsign: template.callsign,
            origin_country: template.origin_country,
            time_position: Date.now(),
            last_contact: Date.now(),
            longitude: -86.7500 + (Math.random() - 0.5) * 0.1,
            latitude: 33.4800 + (Math.random() - 0.5) * 0.1,
            baro_altitude: template.baro_altitude + Math.floor((Math.random() - 0.5) * 1000),
            on_ground: false,
            velocity: template.velocity + Math.floor((Math.random() - 0.5) * 30),
            true_track: Math.floor(Math.random() * 360),
            vertical_rate: Math.floor((Math.random() - 0.5) * 10),
            geo_altitude: template.baro_altitude,
            squawk: ['1200', '2000', '4000', '7700'][Math.floor(Math.random() * 4)],
            spi: false,
            position_source: 0
          },
          distance: template.distance + (Math.random() - 0.5) * 3,
          isOverhead: true
        });
      }
      
      const demoFlights = selectedFlights;
      
      this.isLoading = false;
      this.nearbyFlights = demoFlights;
      this.hasSearched = true;
      this.debugMessage = `Demo: Found ${demoFlights.length} flights (randomized)`;
      
      // Emit to game
      const overheadFlights = demoFlights.filter(f => f.isOverhead);
      if (overheadFlights.length > 0) {
        this.emitOverheadFlightsToGame(overheadFlights);
      }
    }, 1500);
  }

  requestLocation(): void {
    // This now redirects user to configure ZIP code in settings
    this.locationError = true;
  }

  private emitOverheadFlightsToGame(overheadFlights: NearbyFlight[]): void {
    // Format flight information for game display
    const flightTexts = overheadFlights.map(nearby => {
      const flight = nearby.flight;
      const callsign = flight.callsign || 'Unknown';
      const speed = flight.velocity ? `${Math.round(flight.velocity * 2.237)} mph` : 'N/A'; // Convert m/s to mph
      const altitude = flight.baro_altitude ? `${Math.round(flight.baro_altitude * 3.281 / 5280 * 10) / 10} miles` : 'N/A'; // Convert m to miles
      const country = flight.origin_country || 'Unknown';
      
      return `Flight: ${callsign} | Speed: ${speed} | Height: ${altitude} | From: ${country}`;
    });

    // Emit to game via EventBus
    EventBus.emit('display-overhead-flights', flightTexts);
  }
}