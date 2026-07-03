import { NavLink, Link, Outlet } from 'react-router-dom';

export function Layout() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="container inner">
          <Link to="/" className="brand">
            <span className="seal" aria-hidden>
              부조
            </span>
            <span>
              <span className="brand-name">부조록</span>
              <span className="brand-tag">봉투 속 마음을, 기록으로</span>
            </span>
          </Link>
          <nav className="site-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              내 행사
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
              설정
            </NavLink>
            <NavLink to="/privacy" className={({ isActive }) => (isActive ? 'active' : '')}>
              프라이버시
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container inner">
          <span>부조록 — 모든 데이터는 이 기기의 브라우저에만 저장됩니다.</span>
          <span>
            <Link to="/privacy" style={{ color: 'inherit' }}>
              프라이버시 안내
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
