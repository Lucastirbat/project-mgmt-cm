import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './context/DataContext'
import LoginPage from './components/LoginPage'
import Layout from './components/Layout'
import Overview from './components/Overview'
import CompanyPage from './components/CompanyPage'
import ProjectPage from './components/ProjectPage'
import SocialMediaPage from './components/SocialMediaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
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
