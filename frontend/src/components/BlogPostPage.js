import React, { useEffect, useState } from "react";
import { SITE_URL, absoluteUrl, breadcrumbJsonLd, useSeo } from "../lib/seo";
import { Link, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Clock, Share2 } from "lucide-react";
import ApiService from "../services/apiService";
import { fallbackToPlaceholder, imageUrl } from "../lib/productDisplay";
import BlogCard, { AuthorLine, formatBlogDate } from "./blog/BlogCard";
import "../styles/blog.css";

// A text block's paragraphs: blank lines split them, single line breaks stay
const paragraphs = (text = "") =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [more, setMore] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setMore([]);
    ApiService.getBlogPost(slug)
      .then(async ({ post: data }) => {
        if (cancelled) return;
        setPost(data);
        // More from the same topic first, then the newest posts
        const [sameTopic, latest] = await Promise.all([
          data.topic ? ApiService.getBlogPosts({ topic: data.topic, limit: 4 }).catch(() => ({ posts: [] })) : { posts: [] },
          ApiService.getBlogPosts({ limit: 4 }).catch(() => ({ posts: [] })),
        ]);
        if (cancelled) return;
        const seen = new Set([data._id]);
        const picks = [...(sameTopic.posts || []), ...(latest.posts || [])].filter((p) => !seen.has(p._id) && seen.add(p._id));
        setMore(picks.slice(0, 3));
      })
      .catch((err) => !cancelled && setError(err.status === 404 ? "This story doesn't exist or isn't published." : "Couldn't load this story."))
      .finally(() => !cancelled && setLoading(false));
    window.scrollTo(0, 0);
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useSeo({
    ready: !loading,
    title: post ? post.title : "Story not found",
    description: post?.summary,
    image: post?.previewImage,
    path: `/blog/${post?.slug || slug}`,
    type: "article",
    noindex: !post,
    jsonLd: post
      ? [
          {
            "@type": "BlogPosting",
            headline: post.title,
            description: post.summary,
            image: post.previewImage ? [imageUrl(post.previewImage)] : undefined,
            datePublished: post.publishedAt,
            dateModified: post.updatedAt || post.publishedAt,
            articleSection: post.topic,
            author: { "@type": post.author?.kind === "user" ? "Person" : "Organization", name: post.author?.name || "Welcome Craft" },
            publisher: { "@id": `${SITE_URL}/#store` },
            mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]
      : null,
  });

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title, url });
        return;
      } catch {
        // fall through to copying
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="wc-page wc-blog min-h-screen">
        <div className="wc-blog-article mx-auto px-4 sm:px-6 py-12 space-y-4" aria-hidden="true">
          <div className="wc-skeleton h-4 w-1/4" />
          <div className="wc-skeleton h-12 w-3/4" />
          <div className="wc-skeleton" style={{ aspectRatio: "16 / 9" }} />
        </div>
        <p className="sr-only" role="status">
          Loading story...
        </p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="wc-page wc-blog min-h-screen flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: "var(--wc-crimson)" }} />
          <h1 className="text-3xl mb-2">Story not found</h1>
          <p className="mb-6" style={{ color: "var(--wc-ink-muted)" }}>
            {error}
          </p>
          <Link to="/blog" className="wc-btn wc-btn-primary">
            Back to the blog
          </Link>
        </div>
      </div>
    );
  }

  const cover = imageUrl(post.coverImage);

  return (
    <div className="wc-page wc-blog min-h-screen">
      <article className="py-10 lg:py-14">
        <header className="wc-blog-article mx-auto px-4 sm:px-6 text-center">
          <Link to="/blog" className="wc-blog-back">
            <ArrowLeft size={14} /> All stories
          </Link>
          <div className="wc-blog-meta justify-center gap-3 mt-6">
            {post.topic && (
              <Link to={`/blog?topic=${encodeURIComponent(post.topic)}`} className="wc-blog-topic">
                {post.topic}
              </Link>
            )}
            <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
          </div>
          <h1 className="wc-blog-post-title">{post.title}</h1>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 mt-5">
            <AuthorLine post={post} large />
            <span className="wc-blog-read">
              <Clock size={13} aria-hidden="true" /> {post.readingMinutes || 1} min read
            </span>
            <button type="button" onClick={share} className="wc-blog-read wc-blog-share">
              <Share2 size={13} aria-hidden="true" /> {copied ? "Link copied" : "Share"}
            </button>
          </div>
        </header>

        {cover && (
          <figure className="wc-blog-cover container mx-auto px-4 sm:px-6 mt-10">
            <img src={cover} alt={post.title} onError={fallbackToPlaceholder} />
          </figure>
        )}

        <div className="wc-blog-article wc-blog-body mx-auto px-4 sm:px-6 mt-10">
          {(post.blocks || []).map((block, i) =>
            block.type === "image" ? (
              <figure key={i} className="wc-blog-figure">
                <img src={imageUrl(block.image)} alt={block.caption || ""} loading="lazy" onError={fallbackToPlaceholder} />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            ) : (
              <section key={i} className="wc-blog-text">
                {block.heading && <h2 className="wc-blog-heading">{block.heading}</h2>}
                {paragraphs(block.text).map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </section>
            )
          )}
        </div>
      </article>

      {more.length > 0 && (
        <section className="wc-blog-more px-4 sm:px-6 py-14">
          <div className="container mx-auto wc-blog-wrap">
            <span className="wc-eyebrow">Keep reading</span>
            <h2 className="text-3xl mt-1 mb-8">
              More <span className="wc-accent">stories</span>
            </h2>
            <div className="wc-blog-grid">
              {more.map((p) => (
                <BlogCard key={p._id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
