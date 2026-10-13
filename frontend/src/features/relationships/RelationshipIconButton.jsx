import { useId } from 'react';

export default function RelationshipIconButton({
  children,
  className = '',
  label,
  showTooltip = true,
  ...buttonProps
}) {
  const tooltipId = useId();

  return (
    <span className={`relationship-icon-button__wrapper ${className}`.trim()}>
      <button
        type="button"
        className="relationship-icon-button"
        aria-label={label}
        aria-describedby={showTooltip ? tooltipId : undefined}
        {...buttonProps}
      >
        {children}
      </button>
      {showTooltip ? (
        <span id={tooltipId} role="tooltip" className="relationship-icon-button__tooltip">
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function PanelChevronIcon({ direction }) {
  const path = direction === 'left' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6';
  return <Icon><path d={path} /></Icon>;
}

export function ExpandIcon() {
  return (
    <Icon>
      <path d="m10 10-6-6m0 0h5M4 4v5" />
      <path d="m14 10 6-6m0 0h-5m5 0v5" />
      <path d="m10 14-6 6m0 0h5m-5 0v-5" />
      <path d="m14 14 6 6m0 0h-5m5 0v-5" />
    </Icon>
  );
}

export function CollapseIcon() {
  return (
    <Icon>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      <path d="m3 3 6 6M21 3l-6 6M3 21l6-6M21 21l-6-6" />
    </Icon>
  );
}

export function ResetLayoutIcon() {
  return (
    <Icon>
      <path d="M20 11a8 8 0 1 0-2.34 5.66" />
      <path d="M20 4v7h-7" />
    </Icon>
  );
}

function Icon({ children }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}
