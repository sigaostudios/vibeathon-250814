export const environment = {
  production: true,
  // In production, use environment variables or secure deployment configs
  polygonApiKey: process.env['POLYGON_API_KEY'] || '',
  polygonApiUrl: 'https://api.polygon.io',
  weatherApi: {
    baseUrl: 'https://api.open-meteo.com/v1',
    endpoints: {
      forecast: '/forecast'
    },
    updateInterval: 15 * 60 * 1000, // 15 minutes
    cacheTimeout: 5 * 60 * 1000     // 5 minutes
  }
};