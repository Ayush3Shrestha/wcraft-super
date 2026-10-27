import React from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { fallbackToPlaceholder, imageUrl } from "../../lib/productDisplay";

// Helpers shared by the blog list and the single post page

export const formatBlogDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

export const postUrl = (post) => `/blog/${post.slug}`;

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "W";

export function AuthorLine({ post, large = false }) {
  const name = post.author?.name || "Welcome Craft";
  return (
    <div className={`wc-blog-author ${large ? "wc-large" : ""}`}>
      <span className="wc-blog-avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <span className="wc-blog-author-name">{name}</span>
    </div>
  );
}

/**
 * A post in the blog grid: the photo when it has one, otherwise the summary,
 * like the reference design's mix of picture and text cards.
 */
export default function BlogCard({ post }) {
  const url = postUrl(post);
  const src = imageUrl(post.previewImage);
  return (
    <article className="wc-blog-card group">
      {src && (
        <Link to={url} className="wc-blog-card-photo" tabIndex={-1} aria-hidden="true">
          <img src={src} alt="" loading="lazy" onError={fallbackToPlaceholder} />
        </Link>
      )}
      <div className="wc-blog-meta">
        <span className="wc-blog-topic">{post.topic || "Journal"}</span>
        <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
      </div>
      <h3 className="wc-blog-card-title">
        <Link to={url}>{post.title}</Link>
      </h3>
      {!src && post.summary && <p className="wc-blog-card-summary">{post.summary}</p>}
      <div className="wc-blog-card-foot">
        <AuthorLine post={post} />
        <span className="wc-blog-read">
          <Clock size={12} aria-hidden="true" /> {post.readingMinutes || 1} min read
        </span>
      </div>
    </article>
  );
}
