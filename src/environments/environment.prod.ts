export const environment = {
  production: true,
  // In production, use environment variables or secure deployment configs
  polygonApiKey: process.env['POLYGON_API_KEY'] || '',
  polygonApiUrl: 'https://api.polygon.io'
};