import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface FlightData {
  icao24: string;
  callsign: string;
  origin_country: string;
  time_position: number;
  last_contact: number;
  longitude: number;
  latitude: number;
  baro_altitude: number;
  on_ground: boolean;
  velocity: number;
  true_track: number;
  vertical_rate: number;
  geo_altitude: number;
  squawk: string;
  spi: boolean;
  position_source: number;
}

export interface NearbyFlight {
  flight: FlightData;
  distance: number;
  isOverhead: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FlightTrackingService {
  private readonly OPENSKY_BASE_URL = 'https://opensky-network.org/api/states/all';
  private readonly OVERHEAD_RADIUS_KM = 5; // 5km radius considered "overhead"
  
  private nearbyFlightsSubject = new BehaviorSubject<NearbyFlight[]>([]);
  public nearbyFlights$ = this.nearbyFlightsSubject.asObservable();

  constructor(private http: HttpClient) {}

  getFlightsInBounds(
    lamin: number,
    lomin: number,
    lamax: number,
    lomax: number
  ): Observable<FlightData[]> {
    const url = `${this.OPENSKY_BASE_URL}?lamin=${lamin}&lomin=${lomin}&lamax=${lamax}&lomax=${lomax}`;
    
    return this.http.get<any>(url).pipe(
      map(response => {
        if (!response.states) return [];
        
        return response.states.map((state: any[]) => ({
          icao24: state[0],
          callsign: state[1]?.trim(),
          origin_country: state[2],
          time_position: state[3],
          last_contact: state[4],
          longitude: state[5],
          latitude: state[6],
          baro_altitude: state[7],
          on_ground: state[8],
          velocity: state[9],
          true_track: state[10],
          vertical_rate: state[11],
          geo_altitude: state[12],
          squawk: state[13],
          spi: state[14],
          position_source: state[15]
        }));
      }),
      catchError(error => {
        console.error('Error fetching flight data:', error);
        return [];
      })
    );
  }

  checkForNearbyFlights(userLat: number, userLon: number): void {
    const radius = 0.1; // ~11km bounding box
    const lamin = userLat - radius;
    const lamax = userLat + radius;
    const lomin = userLon - radius;
    const lomax = userLon + radius;

    this.getFlightsInBounds(lamin, lomin, lamax, lomax).subscribe(flights => {
      const nearbyFlights: NearbyFlight[] = flights
        .filter(flight => flight.longitude && flight.latitude && !flight.on_ground)
        .map(flight => {
          const distance = this.calculateDistance(
            userLat, userLon,
            flight.latitude, flight.longitude
          );
          
          return {
            flight,
            distance,
            isOverhead: distance <= this.OVERHEAD_RADIUS_KM
          };
        })
        .filter(nearby => nearby.distance <= 20); // Only flights within 20km
      
      this.nearbyFlightsSubject.next(nearbyFlights);
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}