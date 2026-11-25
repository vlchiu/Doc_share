import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import useRemoteData from '../../hooks/useRemoteData';
import Modal from './Modal';
import CollectionForm from './CollectionForm';
import { LoadingState, ErrorState } from './ResourceState';

function Picker(
  {
    documentId,
    onClose
  }
) {
  const {
    data = [],
    loading,
    error,
    retry
  } = useRemoteData('/collections');

  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  async function add(id) {
    if (busy)
      return;

    setBusy(true);

    try {
      await axiosClient.post(`/collections/${id}/items`, {
        document_id: documentId
      });

      toast.success('Đã thêm vào bộ sưu tập.');
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không thêm được tài liệu.');
    } finally {
      setBusy(false);
    }
  }

  if (creating) return (
    <CollectionForm
      onClose={() => setCreating(false)}
      onSaved={c => {
        setCreating(false);
        retry();
        add(c.id);
      }} />
  );

  return (
    <Modal title='Thêm vào bộ sưu tập' onClose={() => !busy && onClose()}>
      {loading ? <LoadingState /> : error ? <ErrorState error={error} onRetry={retry} /> : <div className='max-h-72 space-y-2 overflow-y-auto'>{data.length ? data.map(c => <button
          disabled={busy}
          key={c.id}
          className='ds-button-outline w-full justify-between text-left'
          onClick={() => add(c.id)}><span className='min-w-0 break-words'>{c.name}</span><span className='shrink-0 text-xs'>{c.visibility === 'PUBLIC' ? 'Công khai' : 'Riêng tư'}</span></button>) : <p>Bạn chưa có bộ sưu tập nào.</p>}</div>}
      <button
        disabled={busy}
        className='ds-button-primary mt-4'
        onClick={() => setCreating(true)}>Tạo bộ sưu tập mới</button>
    </Modal>
  );
}

export default function AddToCollection(
  {
    documentId
  }
) {
  const [open, setOpen] = useState(false);

  if (!localStorage.getItem('token'))
    return <Link to='/login' className='ds-button-outline'>Đăng nhập để tạo bộ sưu tập</Link>;

  return <><button className='ds-button-outline' onClick={() => setOpen(true)}>Thêm vào bộ sưu tập</button>{open && <Picker documentId={documentId} onClose={() => setOpen(false)} />}</>;
}
