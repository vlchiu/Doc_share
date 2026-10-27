import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      await axiosClient.post('/auth/verify-email', { email, otp });
      setSuccess(true);
    } catch (error) { setMessage(error.response?.data?.message || 'Chưa thể xác thực. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setMessage('');
    try { const { data } = await axiosClient.post('/auth/resend-verify', { email }); setMessage(data.message); }
    catch (error) { setMessage(error.response?.data?.message || 'Chưa thể gửi lại OTP.'); }
    finally { setBusy(false); }
  }
  return <div className="max-w-md mx-auto bg-white rounded-2xl p-8 border border-slate-200 space-y-4">
    <h1 className="text-xl font-bold">Xác thực email</h1>
    {success ? <p>Xác thực thành công. <Link to="/login" className="text-indigo-600 underline">Đăng nhập</Link></p> :
      <form onSubmit={submit} className="space-y-4">
        <label className="block">Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="block w-full border rounded-lg p-2" /></label>
        <label className="block">Mã OTP<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} className="block w-full border rounded-lg p-2" /></label>
        <button disabled={busy} className="bg-indigo-600 text-white rounded-lg px-4 py-2">{busy ? 'Đang xử lý...' : 'Xác thực'}</button>
        <button type="button" disabled={busy || !email} onClick={resend} className="ml-3 text-indigo-600">Gửi lại mã</button>
      </form>}
    {message && <p role="status">{message}</p>}
  </div>;
}
