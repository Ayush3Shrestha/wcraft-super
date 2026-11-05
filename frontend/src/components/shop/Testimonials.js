import React, { useEffect, useState } from "react";
import { Quote, Star } from "lucide-react";
import ApiService from "../../services/apiService";
import { imageUrl } from "../../lib/productDisplay";
import CardSlider from "./CardSlider";

function Stars({ rating }) {
  return (
    <div className="wc-testimonial-stars" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={15} aria-hidden="true" className={n <= rating ? "wc-on" : ""} />
      ))}
    </div>
  );
}

// Home page section with published testimonials; hidden until there are some
export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    ApiService.getTestimonials()
      .then((data) => setTestimonials(data.testimonials || []))
      .catch(() => {});
  }, []);

  if (!testimonials.length) return null;

  return (
    <section className="wc-testimonials px-4 sm:px-6 py-16 lg:py-20">
      <div className="container mx-auto">
        <div className="mb-10">
          <span className="wc-eyebrow">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl mt-2">
            What our <span className="wc-accent">Customers</span> Say
          </h2>
        </div>
        <CardSlider perView={3} label="Customer testimonials">
          {testimonials.map((t) => (
            <figure key={t._id} className="wc-testimonial">
              <Quote size={26} className="wc-testimonial-mark" aria-hidden="true" />
              <Stars rating={t.rating} />
              <blockquote>{t.quote}</blockquote>
              <figcaption>
                {t.photo ? (
                  <img src={imageUrl(t.photo)} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="wc-testimonial-initial" aria-hidden="true">
                    {t.name[0]?.toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="wc-testimonial-name">{t.name}</span>
                  {t.location && <span className="wc-testimonial-location">{t.location}</span>}
                </span>
              </figcaption>
            </figure>
          ))}
        </CardSlider>
      </div>
    </section>
  );
}
