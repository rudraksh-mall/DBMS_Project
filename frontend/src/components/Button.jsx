export function Button({
  variant = 'primary',
  size = 'default',
  children,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  };

  const sizes = {
    sm: 'h-10 px-4 text-xs!',
    default: '',
    lg: 'h-12 px-8 text-base!',
  };

  const classes = `${variants[variant]} inline-flex items-center justify-center gap-2 ${sizes[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}