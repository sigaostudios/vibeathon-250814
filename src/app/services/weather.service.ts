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
    // Start fresh - no saved location initially
    this.manualLocation = null;
    localStorage.removeItem('manualLocation');
    localStorage.removeItem('lastWeatherData');
    localStorage.removeItem('lastWeatherUpdate');
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
      
      // Parse input to detect if it's "city state" format without comma
      const originalInputLower = locationName.toLowerCase();
      let searchQuery = locationName;
      
      // If input looks like "city state" format, reformat to "city, state" for better geocoding
      if (!originalInputLower.includes(',')) {
        const parts = originalInputLower.split(' ').map(p => p.trim());
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          if (lastPart.length === 2 || this.isValidStateName(lastPart)) {
            // Reformat "hoover al" to "hoover, alabama" for better results
            const cityPart = parts.slice(0, -1).join(' ');
            const statePart = this.getFullStateName(lastPart);
            searchQuery = `${cityPart}, ${statePart}`;
            console.log(`Reformatted search query: "${searchQuery}"`);
          }
        }
      }
      
      // Use OpenStreetMap Nominatim for geocoding (free, no API key)
      // Request multiple results to find the best match
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1&countrycodes=us`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('Location not found');
      }
      
      // Debug: Log all results to see what we're getting
      console.log('All geocoding results:');
      data.forEach((result: any, index: number) => {
        console.log(`Result ${index}:`, {
          display_name: result.display_name,
          state: result.address?.state,
          country: result.address?.country,
          lat: result.lat,
          lon: result.lon
        });
      });
      
      // Find the best match, prioritizing US locations and exact state matches
      let bestResult = data[0]; // Default to first result
      const searchInputLower = searchQuery.toLowerCase();
      let inputState = '';
      
      // Parse input for state - handle both "city, state" and "city state" formats
      if (searchInputLower.includes(',')) {
        // Format: "city, state"
        const parts = searchInputLower.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          inputState = parts[1];
        }
      } else {
        // Format: "city state" - check if last word is a state abbreviation
        const parts = searchInputLower.split(' ').map(p => p.trim());
        if (parts.length >= 2) {
          const lastPart = parts[parts.length - 1];
          // Check if last part is a valid state abbreviation (2 letters) or state name
          if (lastPart.length === 2 || this.isValidStateName(lastPart)) {
            inputState = lastPart;
            console.log(`Detected state from input: "${inputState}"`);
          }
        }
      }
      
      // If we found a potential state in the input, look for a matching result
      if (inputState) {
        console.log(`Looking for results matching state: "${inputState}"`);
        for (let i = 0; i < data.length; i++) {
          const result = data[i];
          const address = result.address;
          if (address && address.state) {
            const resultState = address.state.toLowerCase();
            const resultStateAbbr = this.getStateAbbreviation(address.state);
            
            console.log(`Checking result ${i}: state="${address.state}", abbr="${resultStateAbbr}"`);
            
            // Check if state matches (full name or abbreviation)
            if (resultState.includes(inputState) || 
                resultStateAbbr.toLowerCase() === inputState ||
                inputState === resultState) {
              bestResult = result;
              console.log(`✅ Found better match for state "${inputState}":`, address.state, 'at index', i);
              break;
            }
          }
        }
      } else {
        console.log('No state detected in input, using first result');
      }
      
      const coords = {
        latitude: parseFloat(bestResult.lat),
        longitude: parseFloat(bestResult.lon)
      };
      
      // Extract a clean city name from the response
      const address = bestResult.address;
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
      console.log(`Full address:`, address);
      
      // Set the location
      this.setManualLocation(cleanCityName, coords);
      
      return true;
    } catch (error) {
      console.error('Failed to geocode location:', error);
      return false;
    }
  }

  private getStateAbbreviation(stateName: string): string {
    const stateMap: { [key: string]: string } = {
      'alabama': 'al', 'alaska': 'ak', 'arizona': 'az', 'arkansas': 'ar', 'california': 'ca',
      'colorado': 'co', 'connecticut': 'ct', 'delaware': 'de', 'florida': 'fl', 'georgia': 'ga',
      'hawaii': 'hi', 'idaho': 'id', 'illinois': 'il', 'indiana': 'in', 'iowa': 'ia',
      'kansas': 'ks', 'kentucky': 'ky', 'louisiana': 'la', 'maine': 'me', 'maryland': 'md',
      'massachusetts': 'ma', 'michigan': 'mi', 'minnesota': 'mn', 'mississippi': 'ms', 'missouri': 'mo',
      'montana': 'mt', 'nebraska': 'ne', 'nevada': 'nv', 'new hampshire': 'nh', 'new jersey': 'nj',
      'new mexico': 'nm', 'new york': 'ny', 'north carolina': 'nc', 'north dakota': 'nd', 'ohio': 'oh',
      'oklahoma': 'ok', 'oregon': 'or', 'pennsylvania': 'pa', 'rhode island': 'ri', 'south carolina': 'sc',
      'south dakota': 'sd', 'tennessee': 'tn', 'texas': 'tx', 'utah': 'ut', 'vermont': 'vt',
      'virginia': 'va', 'washington': 'wa', 'west virginia': 'wv', 'wisconsin': 'wi', 'wyoming': 'wy'
    };
    
    return stateMap[stateName.toLowerCase()] || stateName.toLowerCase();
  }

  private isValidStateName(input: string): boolean {
    const stateNames = [
      'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 
      'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
      'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan', 
      'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire', 
      'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
      'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 
      'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia', 
      'wisconsin', 'wyoming'
    ];
    
    const stateAbbrs = [
      'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga', 'hi', 'id', 'il', 'in', 'ia',
      'ks', 'ky', 'la', 'me', 'md', 'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
      'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc', 'sd', 'tn', 'tx', 'ut', 'vt',
      'va', 'wa', 'wv', 'wi', 'wy'
    ];
    
    const inputLower = input.toLowerCase();
    return stateNames.includes(inputLower) || stateAbbrs.includes(inputLower);
  }

  private getFullStateName(input: string): string {
    const abbrToFullName: { [key: string]: string } = {
      'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
      'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
      'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
      'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
      'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi', 'mo': 'missouri',
      'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire', 'nj': 'new jersey',
      'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio',
      'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
      'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah', 'vt': 'vermont',
      'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming'
    };
    
    const inputLower = input.toLowerCase();
    return abbrToFullName[inputLower] || input;
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