import { registerRootComponent } from 'expo';

import App from './App';
import { initAnalytics } from './src/services/Analytics';

// Crash reporting must be initialised before the first render.
initAnalytics();

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
