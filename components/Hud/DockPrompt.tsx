// Bottom-center "Press E / tap to dock at X" — floats while a docking
// target is in range. Click also docks (mobile-friendly).

type Props = {
  dockName: string;
  onDock: () => void;
};

export function DockPrompt({ dockName, onDock }: Props) {
  return (
    <button
      onClick={onDock}
      style={{
        position: 'absolute',
        bottom: 34,
        left: '50%',
        transform: 'translate(-50%, 0)',
        animation: 'bwfloat 2.2s ease-in-out infinite',
        fontFamily: '"Baloo 2", sans-serif',
        fontWeight: 700,
        fontSize: 16,
        color: '#3a2a12',
        background: '#ffd43b',
        border: 'none',
        borderBottom: '5px solid #e8a700',
        borderRadius: 16,
        padding: '12px 22px',
        cursor: 'pointer',
        boxShadow: '0 10px 26px rgba(232,167,0,.4)',
        whiteSpace: 'nowrap',
      }}
    >
      Press{' '}
      <span
        style={{
          background: '#fff',
          borderRadius: 6,
          padding: '1px 8px',
          borderBottom: '2px solid #d7b500',
        }}
      >
        E
      </span>{' '}
      / tap to dock at <b>{dockName}</b>
    </button>
  );
}
