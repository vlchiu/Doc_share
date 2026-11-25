import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import useRemoteData from '../hooks/useRemoteData';
import CollectionForm from '../components/docshare/CollectionForm';
import { LoadingState, ErrorState } from '../components/docshare/ResourceState';

function CollectionList({ following }) {
  const { data = [], setData, loading, error, retry } = useRemoteData(following ? '/collections/following' : '/collections');
  const [busy, setBusy] = useState(null);
  async function unfollow(id) {
    if (busy !== null) return;
    setBusy(id);
    try {
      await axiosClient.delete(`/collections/${id}/follow`);
      setData(rows => rows.filter(row => row.id !== id));
      toast.success('Đã bỏ theo dõi bộ sưu tập.');
    } catch (e) { toast.error(e.response?.data?.message || 'Không bỏ theo dõi được.'); }
    finally { setBusy(null); }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (!data.length) return <div className="rounded-2xl border border-dashed p-8 text-center"><p>{following ? 'Bạn chưa theo dõi bộ sưu tập nào. Mở liên kết bộ công khai và bấm Theo dõi bộ sưu tập.' : 'Chưa có bộ sưu tập. Tạo bộ đầu tiên để tổ chức tài liệu của bạn.'}</p></div>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.map(c => (
        <article key={c.id} className="min-w-0 rounded-2xl border border-blue-100 bg-white p-5">
          {following && !c.available ? <p className="text-slate-500">Bộ sưu tập không còn công khai</p> : <>
            <span className="text-xs text-blue-600">{c.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}</span>
            <h2 className="my-3 break-words text-lg font-bold"><Link className="hover:text-blue-600" to={`/collections/${c.id}`}>{c.name}</Link></h2>
            <p className="line-clamp-3 break-words text-sm text-slate-500">{c.description || 'Chưa có mô tả'}</p>
            {following && <p className="mt-3 text-sm">Của <Link className="text-blue-600" to={`/users/${c.user.id}`}>{c.user.name}</Link></p>}
            <p className="mt-4 text-sm">{c._count.items} tài liệu có thể xem</p>
          </>}
          {following && <button disabled={busy !== null} className="ds-button-outline mt-4 text-sm" onClick={() => unfollow(c.id)}>{busy === c.id ? 'Đang cập nhật…' : 'Bỏ theo dõi bộ sưu tập'}</button>}
        </article>
      ))}
    </div>
  );
}
export default function Collections() {
  const [params, setParams] = useSearchParams();
  const following = params.get('tab') === 'following';
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Bộ sưu tập</h1><p className="mt-2 text-slate-500">Tổ chức tài liệu của bạn và theo dõi bộ sưu tập công khai.</p></div>
        <button className="ds-button-primary" onClick={() => setCreating(true)}>Tạo bộ sưu tập</button>
      </div>
      <nav aria-label="Danh sách bộ sưu tập" className="flex flex-wrap gap-3">
        <button aria-current={!following ? 'page' : undefined} className={!following ? 'ds-button-primary' : 'ds-button-outline'} onClick={() => setParams({})}>Của tôi</button>
        <button aria-current={following ? 'page' : undefined} className={following ? 'ds-button-primary' : 'ds-button-outline'} onClick={() => setParams({ tab: 'following' })}>Đang theo dõi</button>
      </nav>
      <CollectionList key={following ? 'following' : 'mine'} following={following} />
      {creating && <CollectionForm onClose={() => setCreating(false)} onSaved={c => navigate(`/collections/${c.id}`)} />}
    </div>
  );
}
