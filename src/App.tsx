import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import LoginPage from './components/LoginPage'
import Layout from './components/Layout'
import Overview from './components/Overview'
import CompanyPage from './components/CompanyPage'
import ProjectPage from './components/ProjectPage'
import SocialMediaPage from './components/SocialMediaPage'
import EmbedTripPage from './components/EmbedTripPage'
import PublicTripPage from './components/PublicTripPage'
import FriendsTripPage from './components/FriendsTripPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public embed routes — no auth, no DataProvider */}
        <Route path="/embed/trip" element={<EmbedTripPage />} />

        {/* Public trip pages — no PM auth needed */}
        <Route path="/trip" element={<PublicTripPage />} />
        <Route path="/trip/friends" element={<FriendsTripPage />} />

        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <DataProvider>
              <Layout />
            </DataProvider>
          }
        >
          <Route index element={<Overview />} />
          <Route path=":companyId" element={<CompanyPage />} />
          <Route path=":companyId/:projectId" element={<ProjectPage />} />
          <Route path="social-media" element={<SocialMediaPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
