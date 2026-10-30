import { Link } from "react-router-dom";
import Brand from "./Brand";
import { DocumentArt, FeatureList } from "./Primitives";
export default function AuthLayout({ register = false, children }) {
  return (
    <div className="ds-auth">
      <section className="ds-auth-showcase">
        <Brand />
        <div className="relative z-10 mt-12 max-w-lg">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-[#080c2e] xl:text-[46px]">
            {register ? (
              <>
                Lưu trữ, tìm kiếm
                <br />
                và khai thác tài liệu
                <br />
                <span className="text-blue-600">thông minh hơn</span>
              </>
            ) : (
              <>
                Chia sẻ tri thức,
                <br />
                <span className="text-blue-600">kiến tạo tương lai</span>
              </>
            )}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[#64769f]">
            {register
              ? "Tham gia DocShare để trải nghiệm không gian lưu trữ an toàn, tìm kiếm nhanh chóng và được hỗ trợ bởi AI."
              : "Lưu trữ, quản lý và chia sẻ tài liệu thông minh cùng AI. Làm việc hiệu quả hơn, mọi lúc mọi nơi."}
          </p>
          <FeatureList />
        </div>
        <DocumentArt />
        <p className="ds-auth-tagline">
          Tri thức
          <br />
          kết nối mọi người
        </p>
      </section>
      <section className="ds-auth-form">
        <Brand />
        {children}
        <nav
          aria-label="Thông tin sử dụng"
          className="mt-6 flex flex-wrap justify-center gap-4 border-t border-blue-100 pt-4 text-xs text-[#60709b]"
        >
          <Link to="/help">Hướng dẫn</Link>
          <Link to="/terms">Điều khoản</Link>
          <Link to="/privacy">Quyền riêng tư</Link>
        </nav>
      </section>
    </div>
  );
}
export function GoogleButton({ register = false }) {
  return (
    <>
      <div className="my-6 flex items-center gap-4 text-xs text-[#8795b6]">
        <span className="h-px flex-1 bg-blue-100" />
        Hoặc tiếp tục với
        <span className="h-px flex-1 bg-blue-100" />
      </div>
      <a
        className="ds-button-outline w-full !py-3.5 text-sm font-semibold !text-[#101535]"
        href={`${import.meta.env.VITE_API_URL}/api/auth/google`}
      >
        <svg width="21" height="21" viewBox="0 0 48 48" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        {register ? "Đăng ký" : "Đăng nhập"} với Google
      </a>
    </>
  );
}
