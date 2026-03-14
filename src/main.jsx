import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import DebateSharePage from './components/DebateSharePage.jsx'
import DebateReplayPage from './components/DebateReplayPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/debate/:debateId" element={<DebateSharePage />} />
        <Route path="/replay/:debateId" element={<DebateReplayPage />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
