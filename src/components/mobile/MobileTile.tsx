interface Props {
  color: string;
  icon: string;
  label: string;
  wide?: boolean;
  onClick: () => void;
}

export function MobileTile({ color, icon, label, wide, onClick }: Props) {
  return (
    <button
      type="button"
      class={`metro-tile${wide ? ' metro-tile-wide' : ''}`}
      style={{ background: color }}
      onClick={onClick}
    >
      <img class="metro-tile-icon" src={icon} alt="" draggable={false} />
      <span class="metro-tile-label">{label}</span>
    </button>
  );
}
