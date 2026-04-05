// TopNav — fixed header bar with Home / Journal / Activities navigation
const TopNav = ({ screen, onNav }) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const isHome       = ['welcome', 'questions', 'results'].includes(screen);
  const isJournal    = screen === 'calendar';
  const isActivities = screen === 'activities';

  const navBtn = (active, label, id) => (
    <button
      key={id}
      onClick={() => onNav(id)}
      style={{
        background: 'none', border: 'none',
        color: active ? '#f5efe6' : 'rgba(245,239,230,0.42)',
        fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
        fontWeight: active ? 600 : 400, cursor: 'pointer',
        padding: '0 0 3px 0', transition: 'color 0.2s',
        borderBottom: active ? '2px solid #c4714f' : '2px solid transparent',
      }}
    >{label}</button>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
      background: 'rgba(26,26,46,0.96)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(245,239,230,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '110px' }}>
        <span style={{ fontSize: '1.1rem' }}>🌙</span>
        <span className="font-serif" style={{ color: '#f5efe6', fontSize: '0.9rem', fontWeight: 600 }}>Tonight?</span>
      </div>
      <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
        {navBtn(isHome,       'Home',       'home')}
        {navBtn(isJournal,    'Journal',    'journal')}
        {navBtn(isActivities, 'Activities', 'activities')}
      </div>
      <div style={{ color: 'rgba(245,239,230,0.32)', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', minWidth: '110px', textAlign: 'right' }}>
        {dateStr}
      </div>
    </div>
  );
};

// ProgressDots — step indicator used in quiz and journal flows
const ProgressDots = ({ current, total }) => (
  <div className="flex items-center gap-2 justify-center mb-10">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          transition: 'all 0.3s ease',
          width:  i === current ? '24px' : '8px',
          height: '8px',
          borderRadius: '9999px',
          background: i < current ? '#c4714f' : i === current ? '#d4a853' : 'rgba(245,239,230,0.18)',
        }}
      />
    ))}
  </div>
);

// TransitionScreen — full-screen soft message, auto-advances after 1.5 s or on tap
const TransitionScreen = ({ onAdvance, message = "Let's go a little deeper." }) => {
  React.useEffect(() => {
    const t = setTimeout(onAdvance, 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fade-in flex flex-col items-center justify-center px-6 text-center"
      onClick={onAdvance}
      style={{ cursor: 'pointer', width: '100%', minHeight: 'calc(100vh - 56px)' }}
    >
      <p className="font-serif text-cream" style={{ fontSize: 'clamp(1.5rem, 6vw, 2rem)', fontStyle: 'italic', fontWeight: 500, marginBottom: '16px', lineHeight: 1.45 }}>
        {message}
      </p>
      <p style={{ color: 'rgba(245,239,230,0.38)', fontSize: '0.9rem', fontFamily: 'Inter, sans-serif' }}>
        Tap anywhere to continue.
      </p>
    </div>
  );
};
