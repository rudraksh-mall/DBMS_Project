export function Card({ children, className = '', onClick, hover = true }) {
  return (
    <div
      className={`card-base ${hover && onClick ? 'cursor-pointer card-hover' : ''} ${className}`}
      onClick={onClick}
      style={!onClick ? {} : undefined}
    >
      {children}
    </div>
  );
}