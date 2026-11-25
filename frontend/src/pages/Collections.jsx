import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useRemoteData from '../hooks/useRemoteData';
import CollectionForm from '../components/docshare/CollectionForm';
import { LoadingState, ErrorState } from '../components/docshare/ResourceState';

export default function Collections() {
  const {
    data = [],
    loading,
    error,
    retry
  } = useRemoteData('/collections');

  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-4'><div><h1 className='text-2xl font-bold'>Bộ sưu tập của tôi</h1><p className='mt-2 text-slate-500'>Sắp xếp tài liệu theo môn học và chủ đề của bạn.</p></div><button className='ds-button-primary' onClick={() => setCreating(true)}>Tạo bộ sưu tập</button></div>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={retry} /> : data.length ? <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>{data.map(c => <Link
          key={c.id}
          to={`/collections/${c.id}`}
          className='min-w-0 rounded-2xl border border-blue-100 bg-white p-5 hover:border-blue-400'><span className='text-xs text-blue-600'>{c.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}</span><h2 className='my-3 break-words text-lg font-bold'>{c.name}</h2><p className='line-clamp-3 break-words text-sm text-slate-500'>{c.description || 'Chưa có mô tả'}</p><p className='mt-4 text-sm'>{c._count.items}tài liệu có thể xem</p></Link>)}</div> : <div className='rounded-2xl border border-dashed p-8 text-center'><p>Chưa có bộ sưu tập. Tạo bộ đầu tiên để tổ chức tài liệu của bạn.</p></div>}
      {creating && <CollectionForm
        onClose={() => setCreating(false)}
        onSaved={c => navigate(`/collections/${c.id}`)} />}
    </div>
  );
}
