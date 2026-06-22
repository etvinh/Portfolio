// Top-left chip: title, control hint, discovered count.

type Props = {
  discovered: number;
  total: number;
};

export function TitleChip({ discovered, total }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        background: 'rgba(255,255,255,.82)',
        borderRadius: 16,
        padding: '10px 16px',
        boxShadow: '0 6px 18px rgba(11,58,102,.18)',
        backdropFilter: 'blur(4px)',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontFamily: '"Baloo 2", sans-serif',
          fontWeight: 800,
          fontSize: 19,
          color: '#e8590c',
          letterSpacing: '.3px',
          lineHeight: 1,
        }}
      >
        Brick&nbsp;Voyage
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 700,
          color: '#5a6b7a',
          marginTop: 5,
        }}
      >
        WASD&nbsp;/&nbsp;arrows to sail&nbsp;&nbsp;·&nbsp;&nbsp;E to dock
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 7,
          whiteSpace: 'nowrap',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            borderRadius: 5,
            background: '#ffd43b',
            color: '#fff',
            fontSize: 11,
            lineHeight: 1,
            flex: 'none',
          }}
        >
          ★
        </span>
        <span
          style={{
            fontFamily: '"Baloo 2", sans-serif',
            fontWeight: 800,
            fontSize: 12,
            color: '#e8a700',
          }}
        >
          Discovered {discovered} / {total}
        </span>
      </div>
    </div>
  );
}
