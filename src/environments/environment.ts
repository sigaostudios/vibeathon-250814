export const environment = {
  production: false,
  weatherApi: {
    baseUrl: 'https://api.open-meteo.com/v1',
    endpoints: {
      forecast: '/forecast'
    },
    updateInterval: 15 * 60 * 1000, // 15 minutes
    cacheTimeout: 5 * 60 * 1000     // 5 minutes
  }
};