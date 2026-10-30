import { Link } from "react-router-dom";
export default function Brand() {
  return (
    <Link
      to="/"
      className="inline-flex shrink-0 items-center gap-2.5 text-xl font-extrabold tracking-tight text-[#07166c] no-underline"
      aria-label="DocShare — Trang chủ"
    >
      <svg width="34" height="38" viewBox="0 0 34 38" aria-hidden="true">
        <defs>
          <linearGradient id="ds-logo" x2="1" y2="1">
            <stop stopColor="#17dbed" />
            <stop offset=".5" stopColor="#009eff" />
            <stop offset="1" stopColor="#124eff" />
          </linearGradient>
        </defs>
        <path
          d="M4 3Q4 0 8 0h9a19 19 0 0 1 0 38H8q-4 0-4-4Z"
          fill="url(#ds-logo)"
        />
        <path d="m15 1 14 15-14 21Z" fill="#1555ff" opacity=".65" />
        <path
          d="m13 11 11 8-11 8v-7l6-1-6-1Z"
          fill="white"
          stroke="white"
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      DocShare
    </Link>
  );
}
