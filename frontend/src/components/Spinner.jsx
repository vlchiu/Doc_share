import { LoadingState } from './docshare/ResourceState';
export default function Spinner({ text = 'Đang tải…' }) {
  return <LoadingState label={text}/>;
}
