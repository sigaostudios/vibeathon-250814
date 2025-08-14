// Import the local environment file directly
import { environment as localEnvironment } from './environment.local';

export const environment = {
  production: false,
  polygonApiKey: localEnvironment.polygonApiKey || '',
  polygonApiUrl: localEnvironment.polygonApiUrl || 'https://api.polygon.io'
};