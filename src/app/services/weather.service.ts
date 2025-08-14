import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WeatherData, GeolocationCoordinates } from '../models/weather.models';
import { EventBus } from '../../game/EventBus';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private weatherSubject = new BehaviorSubject<WeatherData | null>(null);
  private manualLocation: { coords: GeolocationCoordinates, cityName: string } | null = null;
  private refreshTimer?: number;
  
  public weather$ = this.weatherSubject.asObservable();

  constructor() {
    this.setupEventListeners();
    this.loadSavedLocation();
  }

  private setupEventListeners() {
    EventBus.on('request-weather-update', this.handleWeatherRequest, this);
  }

  private async handleWeatherRequest() {
    try {
      const weatherData = await this.getCurrentWeatherWithFallbacks();
      EventBus.emit('weather-data-received', weatherData);
      this.startAutoRefresh();
    } catch (error) {
      EventBus.emit('weather-error', error);
    }
  }

  async getCurrentWeather(): Promise<WeatherData> {
    // Check if location is set
    const locationResult = this.getLocation();
    
    if (!locationResult) {
      throw new Error('No location set. Please set your location first.');
    }
    
    // Fetch weather directly with fetch API
    const url = `${environment.weatherApi.baseUrl}${environment.weatherApi.endpoints.forecast}?` +
      `latitude=${locationResult.coords.latitude}&longitude=${locationResult.coords.longitude}&` +
      `current=weather_code,temperature_2m,relative_humidity_2m,wind_speed_10m&` +
      `timezone=auto`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Parse and return
    return this.parseWeatherResponse(data, locationResult.coords, locationResult.cityName);
  }

  private loadSavedLocation() {
    const saved = localStorage.getItem('manualLocation');
    if (saved) {
      try {
        this.manualLocation = JSON.parse(saved);
        console.log('Loaded saved location:', this.manualLocation?.cityName);
      } catch (error) {
        console.warn('Failed to load saved location:', error);
        localStorage.removeItem('manualLocation');
      }
    }
  }

  private getLocation(): { coords: GeolocationCoordinates, cityName: string } | null {
    if (this.manualLocation) {
      return this.manualLocation;
    }
    
    // No default location - user must set one manually
    return null;
  }

  public setManualLocation(cityName: string, coords: GeolocationCoordinates) {
    this.manualLocation = { coords, cityName };
    
    // Save to localStorage
    localStorage.setItem('manualLocation', JSON.stringify(this.manualLocation));
    
    console.log('Manual location set:', cityName, coords);
    
    // Immediately update weather for new location
    this.handleWeatherRequest();
  }

  public clearManualLocation() {
    this.manualLocation = null;
    localStorage.removeItem('manualLocation');
    console.log('Manual location cleared');
  }

  public getCurrentLocationName(): string {
    const location = this.getLocation();
    return location ? location.cityName : 'No location set';
  }

  public hasLocationSet(): boolean {
    return this.getLocation() !== null;
  }

  public async setLocationByName(locationName: string): Promise<boolean> {
    try {
      console.log(`Looking up coordinates for: ${locationName}`);
      
      // Use OpenStreetMap Nominatim for geocoding (free, no API key)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('Location not found');
      }
      
      const result = data[0];
      const coords = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      };
      
      // Extract a clean city name from the response
      const address = result.address;
      let cleanCityName = locationName; // Use input as fallback
      
      if (address) {
        const city = address.city || address.town || address.village;
        const state = address.state;
        const country = address.country;
        
        if (city && state) {
          cleanCityName = `${city}, ${state}`;
        } else if (city && country) {
          cleanCityName = `${city}, ${country}`;
        } else if (city) {
          cleanCityName = city;
        }
      }
      
      console.log(`Found coordinates for ${cleanCityName}:`, coords);
      
      // Set the location
      this.setManualLocation(cleanCityName, coords);
      
      return true;
    } catch (error) {
      console.error('Failed to geocode location:', error);
      return false;
    }
  }

  private parseWeatherResponse(response: any, coords: GeolocationCoordinates, cityName: string): WeatherData {
    const current = response.current;
    
    return {
      condition: this.mapWeatherCodeToCondition(current.weather_code),
      temperature: current.temperature_2m,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      location: cityName,
      timestamp: new Date(),
      isRealTime: true
    };
  }

  private mapWeatherCodeToCondition(code: number): WeatherData['condition'] {
    if (code <= 3) return 'sunny';        // Clear/partly cloudy
    if (code <= 48) return 'cloudy';      // Overcast/fog  
    if (code <= 67) return 'rainy';       // Rain
    if (code <= 77) return 'snowy';       // Snow
    if (code <= 82) return 'rainy';       // Showers
    if (code <= 99) return 'stormy';      // Thunderstorms
    return 'cloudy';
  }

  private async getCurrentWeatherWithFallbacks(): Promise<WeatherData> {
    try {
      const weather = await this.getCurrentWeather();
      this.cacheWeather(weather);
      return weather;
    } catch (error) {
      console.warn('Live weather failed, trying cache:', error);
      
      const cached = this.getCachedWeather();
      if (cached) {
        return { ...cached, isRealTime: false };
      }
      
      // Ultimate fallback
      return this.getDefaultWeather();
    }
  }

  private cacheWeather(weather: WeatherData) {
    localStorage.setItem('lastWeatherData', JSON.stringify(weather));
    localStorage.setItem('lastWeatherUpdate', Date.now().toString());
  }

  private getCachedWeather(): WeatherData | null {
    try {
      const cached = localStorage.getItem('lastWeatherData');
      const timestamp = localStorage.getItem('lastWeatherUpdate');
      
      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < environment.weatherApi.cacheTimeout) {
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    return null;
  }

  private getDefaultWeather(): WeatherData {
    return {
      condition: 'sunny',
      temperature: 20,
      humidity: 50,
      windSpeed: 5,
      location: 'Default Location',
      timestamp: new Date(),
      isRealTime: false
    };
  }

  private startAutoRefresh() {
    this.stopAutoRefresh();
    
    this.refreshTimer = window.setInterval(async () => {
      try {
        const weatherData = await this.getCurrentWeather();
        EventBus.emit('weather-data-received', weatherData);
      } catch (error) {
        console.warn('Auto weather refresh failed:', error);
      }
    }, environment.weatherApi.updateInterval);
  }

  private stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  public destroy() {
    this.stopAutoRefresh();
    EventBus.off('request-weather-update', this.handleWeatherRequest, this);
  }
}