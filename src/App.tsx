// 应用路由：旅程首页 + 五个功能视图（星表 / 星系 / 光谱 / 演化 / 我的星表）
// BrowserRouter 在 main.tsx 中包裹

import { Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import JourneyPage from './pages/JourneyPage'
import CatalogPage from './pages/CatalogPage'
import GalaxyPage from './pages/GalaxyPage'
import SpectrumPage from './pages/SpectrumPage'
import EvolutionPage from './pages/EvolutionPage'
import MyStarsPage from './pages/MyStarsPage'
import VizDemoPage from './pages/VizDemoPage'

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<JourneyPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/galaxy" element={<GalaxyPage />} />
        <Route path="/galaxy/:name" element={<GalaxyPage />} />
        <Route path="/spectrum" element={<SpectrumPage />} />
        <Route path="/spectrum/:name" element={<SpectrumPage />} />
        <Route path="/evolution" element={<EvolutionPage />} />
        <Route path="/mystars" element={<MyStarsPage />} />
        {/* 临时：可视化组件试验场（评估外部可视化库效果，可删除） */}
        <Route path="/viz-demo" element={<VizDemoPage />} />
      </Routes>
    </>
  )
}

export default App
