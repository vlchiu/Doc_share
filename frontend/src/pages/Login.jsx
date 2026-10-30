import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "../api/axiosClient";
import AuthLayout, { GoogleButton } from "../components/docshare/AuthLayout";
import FormField from "../components/docshare/FormField";
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needVerify, setNeedVerify] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNeedVerify(false);
    try {
      const res = await axiosClient.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.user.id);
      toast.success("Đăng nhập thành công!");
      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch (error) {
      if (error.response?.data?.needVerify) setNeedVerify(true);
      else
        toast.error(
          error.response?.data?.message || "Sai thông tin đăng nhập!",
        );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerify = async () => {
    setResendLoading(true);
    try {
      await axiosClient.post("/auth/resend-verify", { email });
      toast.success("Đã gửi lại email xác thực!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi gửi email");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h2 className="mt-8 text-3xl font-extrabold tracking-tight lg:text-4xl">
        Chào mừng trở lại
      </h2>
      <p className="mb-8 mt-3 text-base leading-relaxed text-[#7181a8]">
        Đăng nhập để tiếp tục khám phá và quản lý tài liệu của bạn trên
        DocShare.
      </p>
      <form onSubmit={handleLogin} className="space-y-5">
        <FormField
          label="Email"
          id="login-email"
          icon={Mail}
          type="email"
          autoComplete="email"
          required
          placeholder="Nhập email của bạn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <FormField
          label="Mật khẩu"
          id="login-password"
          icon={Lock}
          type="password"
          autoComplete="current-password"
          required
          placeholder="Nhập mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-semibold text-blue-600"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <button disabled={loading} className="ds-button-primary w-full !py-4">
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          <ArrowRight size={20} />
        </button>
      </form>
      {needVerify && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"
        >
          <p>Tài khoản chưa xác thực email. Kiểm tra hộp thư {email}.</p>
          <button
            disabled={resendLoading}
            onClick={handleResendVerify}
            className="mt-3 font-semibold text-blue-600"
          >
            {resendLoading ? "Đang gửi…" : "Gửi lại mã xác thực"}
          </button>
          <Link
            to={`/verify-email?email=${encodeURIComponent(email)}`}
            className="mt-2 block text-blue-600 underline"
          >
            Nhập mã OTP
          </Link>
        </div>
      )}
      <GoogleButton />
      <p className="mt-7 text-center text-sm text-[#7181a8]">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-semibold text-blue-600">
          Đăng ký ngay
        </Link>
      </p>
    </AuthLayout>
  );
}
export default Login;
