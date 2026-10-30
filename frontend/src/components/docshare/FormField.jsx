import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export default function FormField({
  label,
  id,
  icon: Icon,
  type = "text",
  hint,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const password = type === "password";
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7181a8]"
            size={20}
          />
        )}
        <input
          id={id}
          type={password && visible ? "text" : type}
          className={`ds-input ${Icon ? "!pl-11" : ""} ${password ? "!pr-11" : ""}`}
          {...props}
        />
        {password && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7181a8]"
            aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        )}
      </div>
      {hint && <p className="mt-2 text-xs text-[#7181a8]">{hint}</p>}
    </div>
  );
}
