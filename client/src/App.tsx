import React from 'react';
import { MapView } from './components/Map/MapView';

export const App: React.FC = () => {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <MapView />
    </div>
  );
};

export default App;
