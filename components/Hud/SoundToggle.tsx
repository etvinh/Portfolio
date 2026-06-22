// Top-right speaker button. Synth ocean ambient starts lazily on first toggle
// (AudioContext autoplay restriction).

type Props = {
  on: boolean;
  onToggle: () => void;
};

export function SoundToggle({ on, onToggle }: Props) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        height: 46,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: '"Baloo 2", sans-serif',
        fontWeight: 700,
        fontSize: 13,
        color: '#1c4a72',
        background: 'rgba(255,255,255,.82)',
        border: 'none',
        borderRadius: 14,
        padding: '0 16px',
        boxShadow: '0 6px 18px rgba(11,58,102,.18)',
        backdropFilter: 'blur(4px)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 17, lineHeight: 1 }}>{on ? '♪' : '×'}</span>
      <span>{on ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
