import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "../api/axiosClient";
import AuthLayout, { GoogleButton } from "../components/docshare/AuthLayout";
import FormField from "../components/docshare/FormField";
function Register() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [confirmPassword, setConfirmPassword] = useState("");
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp!");
      return;
    }
    if (password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }
    setLoading(true);
    try {
      const response = await axiosClient.post("/auth/register", {
        name,
        email,
        password,
      });
      toast.success(
        response.message ||
          response.data?.message ||
          "Vui lòng kiểm tra email để lấy mã OTP.",
      );
      setStep(2);
      startCooldown();
    } catch (error) {
      if (error.response?.data?.needVerify) {
        setStep(2);
        toast("Hãy gửi lại OTP để tiếp tục xác thực.");
      } else toast.error(error.response?.data?.message || "Có lỗi xảy ra!");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      toast.error("Vui lòng nhập đủ 6 chữ số mã OTP");
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post("/auth/verify-email", { email, otp: otpCode });
      toast.success("Xác thực tài khoản thành công!");
      setTimeout(() => navigate("/login"), 1000);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Mã OTP không đúng hoặc đã hết hạn!",
      );
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await axiosClient.post("/auth/resend-verify", { email });
      toast.success("Đã gửi lại mã OTP!");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      startCooldown();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi gửi lại OTP");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <AuthLayout register>
      <h2 className="mt-7 text-3xl font-extrabold tracking-tight">
        {step === 1 ? "Tạo tài khoản mới" : "Xác thực email"}
      </h2>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-[#7181a8]">
        {step === 1
          ? "Bắt đầu hành trình quản lý tài liệu thông minh cùng DocShare chỉ trong vài phút."
          : `Nhập mã 6 chữ số đã gửi đến ${email}.`}
      </p>
      {step === 1 ? (
        <>
          <form onSubmit={handleRegister} className="space-y-4">
            <FormField
              label="Họ và tên"
              id="register-name"
              icon={User}
              required
              autoComplete="name"
              placeholder="Nhập họ và tên của bạn"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FormField
              label="Email"
              id="register-email"
              icon={Mail}
              type="email"
              required
              autoComplete="email"
              placeholder="Nhập địa chỉ email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormField
              label="Mật khẩu"
              id="register-password"
              icon={Lock}
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Nhập mật khẩu"
              hint="Mật khẩu phải có ít nhất 6 ký tự."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FormField
              label="Xác nhận mật khẩu"
              id="register-confirm"
              icon={Lock}
              type="password"
              required
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              disabled={loading}
              className="ds-button-primary w-full !py-3.5"
            >
              {loading ? "Đang đăng ký…" : "Đăng ký ngay"}
              <ArrowRight size={18} />
            </button>
          </form>
          <GoogleButton register />
          <p className="mt-6 text-center text-sm text-[#7181a8]">
            Đã có tài khoản?{" "}
            <Link to="/login" className="font-semibold text-blue-600">
              Đăng nhập
            </Link>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={handleVerify}>
            <div className="mb-6 flex gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  aria-label={`Chữ số OTP ${index + 1}`}
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="ds-input min-w-0 !px-0 text-center text-xl"
                />
              ))}
            </div>
            <button disabled={loading} className="ds-button-primary w-full">
              {loading ? "Đang xác thực…" : "Xác nhận & Hoàn tất"}
            </button>
          </form>
          <button
            className="mt-5 w-full text-sm text-blue-600 disabled:text-slate-400"
            disabled={resendLoading || resendCooldown > 0}
            onClick={handleResend}
          >
            {resendCooldown > 0
              ? `Gửi lại mã sau ${resendCooldown}s`
              : resendLoading
                ? "Đang gửi…"
                : "Gửi lại mã OTP"}
          </button>
        </>
      )}
    </AuthLayout>
  );
}
export default Register;
