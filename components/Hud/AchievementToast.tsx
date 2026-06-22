// Top-center pop-in toast that appears when the player discovers a new
// island (or finds all of them). The Game clears `achievement` to null on
// its own 3s timer.

type Props = {
  title: string;
  all: boolean;
};

export function AchievementToast({ title, all }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 84,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        background: '#fff',
        borderRadius: 18,
        padding: '12px 20px 12px 13px',
        boxShadow: '0 14px 34px rgba(8,30,55,.34)',
        borderBottom: '5px solid #e8a700',
        animation: 'bwpop .26s ease-out',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          background: '#ffd43b',
          borderBottom: '3px solid #e8a700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 24,
          lineHeight: 1,
        }}
      >
        ★
      </div>
      <div>
        <div
          style={{
            fontFamily: '"Baloo 2", sans-serif',
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: '#e8a700',
          }}
        >
          {all ? 'All Islands Discovered' : 'Island Discovered'}
        </div>
        <div
          style={{
            fontFamily: '"Baloo 2", sans-serif',
            fontWeight: 800,
            fontSize: 17,
            color: '#1d2b36',
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
      </div>
    </div>
  );
}
