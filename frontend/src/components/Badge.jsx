import { Clock, CheckCircle, AlertCircle, Loader, XCircle, Eye } from 'lucide-react';

const STATUS_CONFIG = {
  submitted:     { icon: Clock,       cls: 'status-submitted',     label: 'Submitted' },
  acknowledged:  { icon: Eye,         cls: 'status-acknowledged',  label: 'Acknowledged' },
  in_progress:   { icon: Loader,      cls: 'status-in_progress',   label: 'In Progress' },
  resolved:      { icon: CheckCircle, cls: 'status-resolved',      label: 'Resolved' },
  rejected:      { icon: XCircle,     cls: 'status-rejected',      label: 'Rejected' },
};

export function Badge({ status, priority, children, className = '' }) {
  if (status) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
    const Icon = cfg.icon;
    return (
      <span className={`status-badge ${cfg.cls} ${className}`}>
        <Icon size={11} />
        {cfg.label}
      </span>
    );
  }

  if (priority) {
    const pMap = {
      low:      'bg-green-500/10 text-green-400',
      medium:   'bg-yellow-500/10 text-yellow-400',
      high:     'bg-red-500/10 text-red-400',
      critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`status-badge ${pMap[priority] || pMap.medium} ${className}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  }

  return (
    <span className={`status-badge bg-white/5 text-text-secondary ${className}`}>
      {children}
    </span>
  );
}