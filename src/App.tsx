function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A0A0F',
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 300, letterSpacing: '0.2em', color: '#ffffff' }}>
        第二地球
      </h1>
      <p style={{ marginTop: '1rem', fontSize: '1rem', color: '#888899' }}>
        系外行星图鉴 · 环境就绪
      </p>
      <p style={{ marginTop: '3rem', fontSize: '0.8rem', color: '#444455' }}>
        React 19 + D3.js + Three.js + Vite
      </p>
    </div>
  )
}

export default App
