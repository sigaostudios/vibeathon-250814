import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { WeatherApiResponse } from '../models/weather.models';

@Injectable({ providedIn: 'root' })
export class WeatherHttpService {
  private baseUrl = environment.weatherApi.baseUrl;

  constructor(private http: HttpClient) {}

  getCurrentWeather(lat: number, lon: number): Observable<WeatherApiResponse> {
    const params = new HttpParams()
      .set('latitude', lat.toString())
      .set('longitude', lon.toString())
      .set('current', 'weather_code,temperature_2m,relative_humidity_2m,wind_speed_10m')
      .set('timezone', 'auto');

    return this.http.get<WeatherApiResponse>(`${this.baseUrl}${environment.weatherApi.endpoints.forecast}`, { params });
  }
}