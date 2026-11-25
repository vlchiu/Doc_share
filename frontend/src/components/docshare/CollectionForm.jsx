import { useState } from 'react';
import Modal from './Modal';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';

export default function CollectionForm(
  {
    collection,
    onClose,
    onSaved
  }
) {
  const [name, setName] = useState(collection?.name || '');
  const [description, setDescription] = useState(collection?.description || '');
  const [visibility, setVisibility] = useState(collection?.visibility || 'PRIVATE');
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      title={collection ? 'Chỉnh sửa bộ sưu tập' : 'Tạo bộ sưu tập'}
      onClose={() => !busy && onClose()}>
      <form
        className='space-y-4'
        onSubmit={async e => {
          e.preventDefault();

          if (busy)
            return;

          setBusy(true);

          try {
            const {
              data
            } = await axiosClient[collection ? 'put' : 'post'](collection ? `/collections/${collection.id}` : '/collections', {
              name,
              description,
              visibility
            });

            toast.success('Đã lưu bộ sưu tập.');
            onSaved(data);
          } catch (error) {
            toast.error(error.response?.data?.message || 'Không lưu được bộ sưu tập.');
          } finally {
            setBusy(false);
          }
        }}>
        <label className='block'>Tên bộ sưu tập<input
            className='ds-input mt-2 w-full'
            required
            maxLength={120}
            value={name}
            onChange={e => setName(e.target.value)} /></label>
        <label className='block'>Mô tả<textarea
            className='ds-input mt-2 w-full'
            rows={4}
            maxLength={2000}
            value={description}
            onChange={e => setDescription(e.target.value)} /></label>
        <label className='block'>Quyền hiển thị<select
            className='ds-input mt-2 w-full'
            value={visibility}
            onChange={e => setVisibility(e.target.value)}><option value='PRIVATE'>Riêng tư</option><option value='PUBLIC'>Công khai qua liên kết</option></select></label>
        <p className='text-sm text-slate-500'>Công khai bộ sưu tập không thay đổi quyền truy cập của tài liệu bên trong. Tên và mô tả sẽ được hiển thị cho người có liên kết.</p>
        <button className='ds-button-primary' disabled={busy || !name.trim()}>{busy ? 'Đang lưu…' : 'Lưu bộ sưu tập'}</button>
      </form>
    </Modal>
  );
}
