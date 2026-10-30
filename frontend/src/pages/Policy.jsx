import { Link } from "react-router-dom";
import { Panel } from "../components/docshare/Primitives";
import { policies } from "../content/policies";
export default function Policy({ kind }) {
  const policy = policies[kind];
  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <header>
        <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          Bản thử nghiệm
        </span>
        <h1 className="mt-4 text-3xl font-extrabold">{policy.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#60709b]">
          {policy.intro}
        </p>
        <p className="mt-2 text-xs text-[#7181a8]">Cập nhật: 30/10/2026</p>
      </header>
      <nav aria-label="Các chính sách" className="flex flex-wrap gap-2">
        {Object.entries(policies).map(([key, value]) => (
          <Link
            key={key}
            aria-current={kind === key ? "page" : undefined}
            to={`/${key}`}
            className={
              kind === key
                ? "ds-button-primary text-xs"
                : "ds-button-outline text-xs"
            }
          >
            {value.title}
          </Link>
        ))}
      </nav>
      {policy.sections.map(([title, text], index) => (
        <Panel key={title} title={`${index + 1}. ${title}`}>
          <p className="text-sm leading-7 text-[#60709b]">{text}</p>
        </Panel>
      ))}
      <Link to="/support" className="ds-button-outline">
        Hỗ trợ và phản hồi →
      </Link>
    </article>
  );
}
