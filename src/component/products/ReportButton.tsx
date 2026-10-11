import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { REPORT_REASONS, createReport } from '../../lib/admin';
import type { ReportReason } from '../../lib/admin';

interface Props {
  productId?: number;
  reviewId?: number;
}

function ReportButton({ productId, reviewId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!user) {
    return (
      <Link className="report-link" to="/auth">
        Войдите, чтобы пожаловаться
      </Link>
    );
  }

  if (done) {
    return <span className="product-meta">Жалоба отправлена, спасибо.</span>;
  }

  if (!open) {
    return (
      <button className="report-link" type="button" onClick={() => setOpen(true)}>
        <Flag size={14} /> Пожаловаться
      </button>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await createReport({ productId, reviewId }, reason, details.trim());
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Что-то пошло не так.');
    }
    setSending(false);
  };

  return (
    <form className="report-form sell-form" onSubmit={handleSubmit}>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as ReportReason)}
      >
        {Object.entries(REPORT_REASONS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <textarea
        rows={2}
        maxLength={1000}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Подробности (необязательно)"
      />

      {error && <p className="form-error">{error}</p>}

      <div className="product-actions">
        <button className="primary-button" type="submit" disabled={sending}>
          {sending ? 'Отправляем...' : 'Отправить'}
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => setOpen(false)}
        >
          Отмена
        </button>
      </div>
    </form>
  );
}

export default ReportButton;