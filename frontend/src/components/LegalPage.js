import React from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { LAST_UPDATED, LEGAL_PAGES } from "../content/legal";
import { breadcrumbJsonLd, useSeo } from "../lib/seo";
import "../styles/legal.css";

function Body({ item }) {
  if (item && item.list) {
    return (
      <ul>
        {item.list.map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    );
  }
  return <p>{item}</p>;
}

// Privacy Policy, Terms of Service and Refund Policy (text in content/legal.js)
export default function LegalPage({ doc }) {
  useSeo({
    title: doc.title,
    description: doc.description,
    path: doc.path,
    jsonLd: [
      { "@type": "WebPage", name: doc.title, description: doc.description },
      breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: doc.title, path: doc.path },
      ]),
    ],
  });

  const others = LEGAL_PAGES.filter((p) => p.path !== doc.path);

  return (
    <div className="wc-page wc-legal min-h-screen">
      <header className="wc-legal-head px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <nav aria-label="Breadcrumb" className="wc-crumbs flex flex-wrap items-center gap-2 mb-6">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{doc.title}</span>
          </nav>
          <span className="wc-eyebrow">Policies</span>
          <h1 className="text-4xl sm:text-5xl mt-2">{doc.title}</h1>
          <p className="wc-legal-updated">Last updated {LAST_UPDATED}</p>
          <p className="wc-legal-intro">{doc.intro}</p>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-12 lg:py-16 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <nav className="wc-legal-toc" aria-label="On this page">
          <p className="wc-legal-toc-title">On this page</p>
          <ol>
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.heading}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="wc-legal-body">
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2>{s.heading}</h2>
              {s.body.map((item, i) => (
                <Body key={i} item={item} />
              ))}
            </section>
          ))}

          <aside className="wc-legal-others">
            <p className="wc-legal-toc-title">Other policies</p>
            <div className="flex flex-wrap gap-3">
              {others.map((p) => (
                <Link key={p.path} to={p.path} className="wc-legal-chip">
                  <FileText size={14} aria-hidden="true" /> {p.title}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
