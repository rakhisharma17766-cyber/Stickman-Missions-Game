import React, { useState } from 'react';
import { HomeScreen } from './HomeScreen';
import { LevelSelectScreen } from './LevelSelectScreen';
import { GameCanvas } from './GameCanvas';

export function App() {
  const [currentScreen, setCurrentScreen] = useState('HOME'); // "HOME" | "LEVEL_SELECT" | "GAME"
  const [activeLevelId, setActiveLevelId] = useState(1);

  const handleStartGame = () => {
    setCurrentScreen('LEVEL_SELECT');
  };

  const handleSelectLevel = (levelId) => {
    setActiveLevelId(Number(levelId));
    setCurrentScreen('GAME');
  };

  const handleNextLevel = (nextLevelId) => {
    setActiveLevelId(Number(nextLevelId));
    setCurrentScreen('GAME');
  };

  const handleReturnToMenu = () => {
    setCurrentScreen('HOME');
  };

  const handleReturnToLevelSelect = () => {
    setCurrentScreen('LEVEL_SELECT');
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#050505] text-gray-100 select-none">
      {currentScreen === 'HOME' && (
        <HomeScreen
          onStartGame={handleStartGame}
          onSelectLevels={() => setCurrentScreen('LEVEL_SELECT')}
        />
      )}

      {currentScreen === 'LEVEL_SELECT' && (
        <LevelSelectScreen
          onBack={handleReturnToMenu}
          onStartLevel={handleSelectLevel}
        />
      )}

      {currentScreen === 'GAME' && (
        <GameCanvas
          levelId={activeLevelId}
          onReturnToMenu={handleReturnToMenu}
          onNextLevel={handleNextLevel}
        />
      )}
    </div>
  );
}

export default App;
