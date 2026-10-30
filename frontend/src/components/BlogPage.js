import React, { useEffect, useState } from "react";
import { useSeo } from "../lib/seo";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Newspaper } from "lucide-react";
import ApiService from "../services/apiService";
import BlogCard, { formatBlogDate, postUrl } from "./blog/BlogCard";
import "../styles/blog.css";

const PAGE_SIZE = 9;

// The big faded word behind the hero title: its first long word
const heroWord = (title = "") =>
  (title.split(/\s+/).find((w) => w.replace(/\W/g, "").length > 3) || title.split(/\s+/)[0] || "").replace(/[^\p{L}\p{N}-]/gu, "").toLowerCase();

// Top slider: featured posts, or the newest ones when none are featured
function HeroSlider({ posts }) {
  const [index, setIndex] = useState(0);
  if (!posts.length) return null;
  const post = posts[index % posts.length];
  const many = posts.length > 1;
  const go = (dir) => setIndex((i) => (i + dir + posts.length) % posts.length);

  return (
    <section className="wc-blog-hero" aria-roledescription="carousel" aria-label="Featured stories">
      <span className="wc-blog-hero-word" aria-hidden="true">
        {heroWord(post.title)}
      </span>
      {many && (
        <button type="button" className="wc-blog-hero-arrow wc-prev" onClick={() => go(-1)} aria-label="Previous story">
          <ArrowLeft size={22} />
        </button>
      )}
      <div className="wc-blog-hero-body" key={post._id} aria-live="polite">
        <span className="wc-blog-hero-dot" aria-hidden="true" />
        <time className="wc-blog-hero-date" dateTime={post.publishedAt}>
          {formatBlogDate(post.publishedAt)}
        </time>
        <h1 className="wc-blog-hero-title">{post.title}</h1>
        <p className="wc-blog-hero-sub">
          {[post.topic, post.summary].filter(Boolean).join(" · ")}
        </p>
        <Link to={postUrl(post)} className="wc-blog-outline-btn">
          Read article
        </Link>
      </div>
      {many && (
        <button type="button" className="wc-blog-hero-arrow wc-next" onClick={() => go(1)} aria-label="Next story">
          <ArrowRight size={22} />
        </button>
      )}
      {many && (
        <div className="wc-blog-hero-dots">
          {posts.map((p, i) => (
            <button
              key={p._id}
              type="button"
              aria-label={`Show story ${i + 1}`}
              aria-current={i === index % posts.length}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const topic = searchParams.get("topic") || "";
  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);

  const [heroPosts, setHeroPosts] = useState([]);
  const [topics, setTopics] = useState([]);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useSeo({
    title: topic ? `${topic} | Blog` : "Blog: Stories from the Workshop",
    description: topic
      ? `Stories about ${topic.toLowerCase()} from Welcome Craft, artisans of Buddhist statues in Patan, Nepal.`
      : "Stories from our workshop in Patan: how Buddhist statues are made, caring for silver, choosing a statue and the people behind the craft.",
    path: `/blog${topic ? `?topic=${encodeURIComponent(topic)}` : ""}${page > 1 ? `${topic ? "&" : "?"}page=${page}` : ""}`,
  });

  useEffect(() => {
    ApiService.getBlogPosts({ featured: true, limit: 5 })
      .then(async (data) => {
        if (data.posts?.length) return setHeroPosts(data.posts);
        const latest = await ApiService.getBlogPosts({ limit: 3 });
        setHeroPosts(latest.posts || []);
      })
      .catch(() => {});
    ApiService.getBlogTopics()
      .then((data) => setTopics(data.topics || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    ApiService.getBlogPosts({ topic, page, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setPosts(data.posts || []);
        setPagination(data.pagination);
      })
      .catch(() => !cancelled && setError("Couldn't load the blog. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [topic, page]);

  const setFilter = (next) => {
    const params = {};
    if (next.topic) params.topic = next.topic;
    if (next.page > 1) params.page = String(next.page);
    setSearchParams(params);
    if (next.page !== page) document.getElementById("wc-blog-list")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="wc-page wc-blog min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 pt-6 lg:pt-8">
        <HeroSlider posts={heroPosts} />
      </div>

      <div id="wc-blog-list" className="container mx-auto px-4 sm:px-6 py-12 lg:py-16 wc-blog-wrap" style={{ scrollMarginTop: "6rem" }}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="wc-eyebrow">The Welcome Craft journal</span>
            <h2 className="text-3xl sm:text-4xl mt-2">
              Stories from the <span className="wc-accent">workshop</span>
            </h2>
          </div>
        </div>

        {topics.length > 0 && (
          <nav className="wc-blog-topics mb-10" aria-label="Topics">
            <button type="button" aria-pressed={!topic} onClick={() => setFilter({ topic: "", page: 1 })}>
              All
            </button>
            {topics.map((t) => (
              <button key={t} type="button" aria-pressed={topic.toLowerCase() === t.toLowerCase()} onClick={() => setFilter({ topic: t, page: 1 })}>
                {t}
              </button>
            ))}
          </nav>
        )}

        {loading ? (
          <div className="wc-blog-grid" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="wc-skeleton" style={{ aspectRatio: "4 / 3" }} />
                <div className="wc-skeleton h-4 w-1/3" />
                <div className="wc-skeleton h-6 w-3/4" />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className="text-center py-12" style={{ color: "var(--wc-crimson)" }}>
            {error}
          </p>
        ) : posts.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper size={36} className="mx-auto mb-3" style={{ color: "var(--wc-gold-deep)" }} />
            <p className="text-lg" style={{ color: "var(--wc-ink-muted)" }}>
              {topic ? `No stories about "${topic}" yet.` : "Our first stories are on their way."}
            </p>
            <Link to="/products" className="wc-btn wc-btn-primary mt-6">
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="wc-blog-grid">
            {posts.map((post) => (
              <BlogCard key={post._id} post={post} />
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <nav className="wc-blog-pager" aria-label="Pages">
            <button type="button" disabled={page <= 1} onClick={() => setFilter({ topic, page: page - 1 })}>
              <span className="wc-line" aria-hidden="true" />
              Prev
            </button>
            <span className="text-sm" style={{ color: "var(--wc-ink-muted)" }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button type="button" disabled={!pagination.hasNext} onClick={() => setFilter({ topic, page: page + 1 })}>
              <span className="wc-line" aria-hidden="true" />
              Next
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
