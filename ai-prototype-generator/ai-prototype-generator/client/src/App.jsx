import { Routes, Route } from 'react-router-dom'
import { PrototypeProvider } from './context/PrototypeContext'
import Layout from './components/Layout/Layout'
import LandingPage from './pages/LandingPage'
import PrototypeGenerator from './pages/PrototypeGenerator'

function App() {
  return (
    <PrototypeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/generator" element={<PrototypeGenerator />} />
        </Routes>
      </Layout>

    </PrototypeProvider>
  )
}

export default App
