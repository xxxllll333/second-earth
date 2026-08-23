// 应用路由：五个视图（星表 / 星系 / 光谱 / 演化 / 我的星表）
// BrowserRouter 在 main.tsx 中包裹

import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import CatalogPage from './pages/CatalogPage'
import GalaxyPage from './pages/GalaxyPage'
import SpectrumPage from './pages/SpectrumPage'
import EvolutionPage from './pages/EvolutionPage'
import MyStarsPage from './pages/MyStarsPage'

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/galaxy" element={<GalaxyPage />} />
        <Route path="/galaxy/:name" element={<GalaxyPage />} />
        <Route path="/spectrum" element={<SpectrumPage />} />
        <Route path="/spectrum/:name" element={<SpectrumPage />} />
        <Route path="/evolution" element={<EvolutionPage />} />
        <Route path="/mystars" element={<MyStarsPage />} />
      </Routes>
    </>
  )
}

export default App
