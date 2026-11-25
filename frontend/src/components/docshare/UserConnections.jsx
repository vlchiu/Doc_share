import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import useRemoteData from '../../hooks/useRemoteData';
import Modal from './Modal';
import { ErrorState, LoadingState } from './ResourceState';

function ConnectionList({ userId, kind, ownProfile, onClose, onChange }) {
  const { data = [], setData, loading, error, retry } = useRemoteData(`/follow/${userId}/${kind}`);
  const [busy, setBusy] = useState(null);
  const authenticated = !!localStorage.getItem('token');
  async function change(person) {
    if (busy !== null) return;
    setBusy(person.id);
    try {
      const { data: result } = await axiosClient[person.isFollowing ? 'delete' : 'put'](`/follow/${person.id}`);
      setData(rows => ownProfile && kind === 'following' && !result.isFollowing
        ? rows.filter(row => row.id !== person.id)
        : rows.map(row => row.id === person.id ? { ...row, isFollowing: result.isFollowing } : row));
      onChange();
      toast.success(result.message);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không cập nhật được theo dõi.');
    } finally { setBusy(null); }
  }
  return (
    <Modal title={kind === 'followers' ? 'Người theo dõi' : 'Đang theo dõi'} onClose={onClose}>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={retry} /> : data.length === 0 ? (
        <p className="py-8 text-center text-slate-500">{kind === 'followers' ? 'Chưa có người theo dõi.' : 'Chưa theo dõi ai.'}</p>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-y-auto">
          {data.map(person => (
            <li key={person.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-blue-50/50 p-3">
              <Link to={`/users/${person.id}`} onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="ds-avatar shrink-0">
                  {person.avatar_url ? <img alt="" src={person.avatar_url.startsWith('http') ? person.avatar_url : `${import.meta.env.VITE_API_URL}${person.avatar_url}`} /> : person.name?.[0]}
                </span>
                <span className="break-words font-semibold">{person.name}</span>
              </Link>
              {authenticated && !person.isSelf && (
                <button className="ds-button-outline text-sm" disabled={busy !== null} onClick={() => change(person)}>
                  {busy === person.id ? 'Đang cập nhật…' : person.isFollowing ? 'Bỏ theo dõi' : ownProfile && kind === 'followers' ? 'Theo dõi lại' : 'Theo dõi'}
                </button>
              )}
              {person.isSelf && <span className="text-sm text-slate-500">Bạn</span>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

export default function UserConnections({ userId, ownProfile = false }) {
  const { data, loading, error, retry } = useRemoteData(`/follow/${userId}/status`);
  const [kind, setKind] = useState(null);
  const [busy, setBusy] = useState(false);
  const authenticated = !!localStorage.getItem('token');
  async function change() {
    if (busy || !data) return;
    setBusy(true);
    try {
      const { data: result } = await axiosClient[data.isFollowing ? 'delete' : 'put'](`/follow/${userId}`);
      retry();
      toast.success(result.message);
    } catch (e) { toast.error(e.response?.data?.message || 'Không cập nhật được theo dõi.'); }
    finally { setBusy(false); }
  }
  return (
    <section aria-label="Theo dõi người dùng" className="mt-4">
      {error ? <ErrorState error={error} onRetry={retry} /> : loading ? <p role="status" className="text-sm text-slate-500">Đang tải thông tin theo dõi…</p> : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button className="font-semibold text-blue-600" onClick={() => setKind('followers')}>{data.followers} người theo dõi</button>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <button className="font-semibold text-blue-600" onClick={() => setKind('following')}>Đang theo dõi {data.following} người</button>
          {!ownProfile && !data.isSelf && (authenticated ? (
            <button className="ds-button-outline" disabled={busy} onClick={change}>{busy ? 'Đang cập nhật…' : data.isFollowing ? 'Bỏ theo dõi' : 'Theo dõi'}</button>
          ) : <Link to="/login" className="text-blue-600">Đăng nhập để theo dõi</Link>)}
        </div>
      )}
      {kind && <ConnectionList key={`${userId}:${kind}`} userId={userId} kind={kind} ownProfile={ownProfile || data?.isSelf} onClose={() => setKind(null)} onChange={retry} />}
    </section>
  );
}
