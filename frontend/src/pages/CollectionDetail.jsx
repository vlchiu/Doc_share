import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';
import useRemoteData from '../hooks/useRemoteData';
import CollectionForm from '../components/docshare/CollectionForm';
import Modal from '../components/docshare/Modal';
import { LoadingState, ErrorState } from '../components/docshare/ResourceState';

function DocumentPicker(
  {
    collectionId,
    existingIds,
    onClose,
    onAdded
  }
) {
  const [source, setSource] = useState('mine');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const {
    data = [],
    loading,
    error,
    retry
  } = useRemoteData(`/documents/${source}`);

  const docs = (Array.isArray(data) ? data : data.documents || []).filter(
    d => d.title.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))
  );

  const [added, setAdded] = useState(existingIds);

  return (
    <Modal title='Chọn tài liệu' onClose={() => !busy && onClose()}>
      <label className='block'>Nguồn tài liệu<select
          className='ds-input my-2 w-full'
          value={source}
          onChange={e => setSource(e.target.value)}><option value='mine'>Tài liệu của tôi</option><option value='saved'>Tài liệu đã lưu</option></select></label>
      <input
        className='ds-input mb-4 w-full'
        aria-label='Tìm tài liệu để thêm'
        placeholder='Tìm theo tên…'
        value={search}
        onChange={e => setSearch(e.target.value)} />
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={retry} /> : <div className='max-h-80 space-y-3 overflow-y-auto'>{docs.length ? docs.map(d => <div
          className='flex items-center justify-between gap-3 border-b pb-3'
          key={d.id}><span className='min-w-0 break-words'>{d.title}</span><button
            className='ds-button-outline shrink-0'
            disabled={busy || added.includes(d.id)}
            onClick={async () => {
              setBusy(true);

              try {
                await axiosClient.post(`/collections/${collectionId}/items`, {
                  document_id: d.id
                });

                setAdded(previous => [...previous, d.id]);
                onAdded();
                toast.success('Đã thêm tài liệu.');
              } catch (e) {
                toast.error(e.response?.data?.message || 'Không thêm được tài liệu.');
              } finally {
                setBusy(false);
              }
            }}>{added.includes(d.id) ? 'Đã thêm' : 'Thêm'}</button></div>) : <p>Không có tài liệu phù hợp. Bạn có thể tải lên hoặc lưu tài liệu trước.</p>}</div>}
    </Modal>
  );
}

export default function CollectionDetail() {
  const {
    id
  } = useParams();

  return <Detail key={id} id={id} />;
}

function Detail(
  {
    id
  }
) {
  const {
    data,
    loading,
    error,
    retry
  } = useRemoteData(`/collections/${id}`);

  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function mutate(fn) {
    if (busy)
      return;

    setBusy(true);

    try {
      await fn();
      retry();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không thực hiện được thao tác.');
    } finally {
      setBusy(false);
    }
  }

  // Keep the current screen while a mutation refreshes it so dialogs retain focus/state.
  const [snapshot, setSnapshot] = useState(null);

  if (data && data !== snapshot)
    setSnapshot(data);

  const c = data || snapshot;

  if (error)
    return <ErrorState error={error} onRetry={retry} title='Không mở được bộ sưu tập' />;

  if (!c)
    return <LoadingState />;

  const items = c.items.filter(
    item => `${item.document.title} ${item.document.description || ''}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))
  );

  return (
    <div className='space-y-6' aria-busy={loading || busy}>
      <Link to='/collections' className='text-sm text-blue-600'>← Bộ sưu tập của tôi</Link>
      <div className='rounded-2xl border border-blue-100 bg-white p-6'><span className='text-sm text-blue-600'>{c.visibility === 'PUBLIC' ? 'Công khai qua liên kết' : 'Riêng tư'}</span><h1 className='my-3 break-words text-2xl font-bold'>{c.name}</h1><p className='whitespace-pre-wrap break-words text-slate-500'>{c.description}</p>
        <p className='my-4 text-sm'>{c.items.length} tài liệu có thể xem. Mỗi tài liệu giữ nguyên quyền truy cập.</p>
        <div className='flex flex-wrap gap-2'>
          {!c.is_owner && c.visibility === 'PUBLIC' && (localStorage.getItem('token') ? (
            <button className='ds-button-primary' disabled={busy || loading} onClick={() => mutate(async () => {
              const { data: result } = await axiosClient[c.is_following ? 'delete' : 'put'](`/collections/${id}/follow`);
              toast.success(result.message);
            })}>{c.is_following ? 'Bỏ theo dõi bộ sưu tập' : 'Theo dõi bộ sưu tập'}</button>
          ) : <Link className='ds-button-outline' to='/login'>Đăng nhập để theo dõi bộ sưu tập</Link>)}
          {c.is_owner && <><button
              disabled={busy || loading}
              className='ds-button-primary'
              onClick={() => setModal('add')}>Thêm tài liệu</button><button
              disabled={busy || loading}
              className='ds-button-outline'
              onClick={() => setModal('edit')}>Chỉnh sửa</button><button
              disabled={busy || loading}
              className='ds-button-outline text-rose-600'
              onClick={() => setModal('delete')}>Xóa bộ sưu tập</button></>}{c.visibility === 'PUBLIC' && <button
            className='ds-button-outline'
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/collections/${id}`);
                toast.success('Đã sao chép liên kết.');
              } catch {
                toast.error('Không sao chép được. Bạn có thể sao chép địa chỉ trên trình duyệt.');
              }
            }}>Sao chép liên kết</button>}</div>
      </div>
      <label className='block'>Tìm trong bộ sưu tập<input
          className='ds-input mt-2 w-full'
          placeholder='Nhập tên hoặc mô tả tài liệu…'
          value={query}
          onChange={e => setQuery(e.target.value)} /></label>
      <div className='space-y-3'>{items.length ? items.map((
          {
            document: d
          }
        ) => {
          const index = c.items.findIndex(i => i.document.id === d.id);

          return (
            <article
              key={d.id}
              className='flex flex-wrap items-center justify-between gap-4 rounded-xl border border-blue-100 bg-white p-4'><div className='min-w-0 flex-1'><Link
                  className='break-words font-semibold text-blue-700'
                  to={`/documents/${d.id}`}>{d.title}</Link><p className='mt-1 text-sm text-slate-500'>{d.user?.name} · {d.file_type}</p></div>{c.is_owner && <div className='flex flex-wrap gap-2'><button
                  className='ds-button-outline'
                  aria-label={`Đưa lên: ${d.title}`}
                  disabled={busy || loading || !!query || index === 0}
                  onClick={() => mutate(() => axiosClient.patch(`/collections/${id}/items/${d.id}`, {
                    direction: 'up'
                  }))}>↑</button><button
                  className='ds-button-outline'
                  aria-label={`Đưa xuống: ${d.title}`}
                  disabled={busy || loading || !!query || index === c.items.length - 1}
                  onClick={() => mutate(() => axiosClient.patch(`/collections/${id}/items/${d.id}`, {
                    direction: 'down'
                  }))}>↓</button><button
                  className='ds-button-outline'
                  disabled={busy || loading}
                  onClick={() => mutate(() => axiosClient.delete(`/collections/${id}/items/${d.id}`))}>Bỏ khỏi bộ sưu tập</button></div>}</article>
          );
        }) : <p className='rounded-xl border border-dashed p-8 text-center'>{query ? 'Không tìm thấy tài liệu phù hợp.' : 'Chưa có tài liệu có thể xem trong bộ sưu tập này.'}</p>}</div>
      {query && c.is_owner && <p className='text-sm text-slate-500'>Xóa từ khóa tìm kiếm để sắp xếp toàn bộ tài liệu.</p>}
      {modal === 'edit' && <CollectionForm
        collection={c}
        onClose={() => setModal(null)}
        onSaved={() => {
          setModal(null);
          retry();
        }} />}
      {modal === 'add' && <DocumentPicker
        collectionId={id}
        existingIds={c.items.map(i => i.document.id)}
        onClose={() => setModal(null)}
        onAdded={retry} />}
      {modal === 'delete' && <Modal title='Xóa bộ sưu tập?' onClose={() => !busy && setModal(null)}><p className='mb-5'>Chỉ xóa bộ sưu tập và danh sách liên kết. Các tài liệu gốc và tài liệu đã lưu vẫn được giữ lại.</p><button
          className='ds-button-primary'
          disabled={busy}
          onClick={() => mutate(async () => {
            await axiosClient.delete(`/collections/${id}`);
            toast.success('Đã xóa bộ sưu tập.');
            navigate('/collections');
          })}>Xác nhận xóa</button></Modal>}
    </div>
  );
}
