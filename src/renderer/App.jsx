import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import TitleBar from './components/layout/TitleBar';
import Sidebar from './components/layout/Sidebar';
import StatusBar from './components/layout/StatusBar';
import HomePage from './pages/HomePage';
import DetectPage from './pages/DetectPage';
import RecommendPage from './pages/RecommendPage';
import MediaPage from './pages/MediaPage';
import UpgradePage from './pages/UpgradePage';
import RestorePage from './pages/RestorePage';
import InstallPage from './pages/InstallPage';

export default function App() {
  return (
    <Router>
      <div className="flex flex-col h-screen bg-dark-950">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/detect" element={<DetectPage />} />
              <Route path="/recommend" element={<RecommendPage />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/upgrade" element={<UpgradePage />} />
              <Route path="/restore" element={<RestorePage />} />
              <Route path="/install" element={<InstallPage />} />
            </Routes>
          </main>
        </div>
        <StatusBar />
      </div>
    </Router>
  );
}
