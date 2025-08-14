export interface WeatherData {
  condition: 'sunny' | 'rainy' | 'stormy' | 'snowy' | 'cloudy' | 'foggy';
  temperature: number;
  humidity: number;
  windSpeed: number;
  location: string;
  timestamp: Date;
  isRealTime: boolean;
}

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface WeatherApiResponse {
  current: {
    weather_code: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    time: string;
  };
}