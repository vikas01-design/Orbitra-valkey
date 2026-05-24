import React from 'react'
import { Link } from 'react-router-dom';
import Slider from "react-slick";
import { bannerImages } from '../config/imageUrls';

const slides = [
  {
    title: "Daily Grocery Order and Get Express Delivery",
    subtitle: "Fresh products delivered to your door in 30 minutes",
    img: bannerImages.banner1,
    bg: "#e8f5e9",
  },
  {
    title: "Top Electronics at Unbeatable Prices",
    subtitle: "Laptops, phones, cameras and more — trending now",
    img: bannerImages.banner2,
    bg: "#e3f2fd",
  },
  {
    title: "Fresh Fruits & Vegetables Every Morning",
    subtitle: "Farm-fresh produce delivered straight to you",
    img: bannerImages.banner3,
    bg: "#fff8e1",
  },
];

const BannerOne = () => {
  function SampleNextArrow(props) {
    const { className, onClick } = props;
    return (
      <button type="button" onClick={onClick}
        className={`${className} slick-next slick-arrow flex-center rounded-circle bg-white text-xl hover-bg-main-600 hover-text-white transition-1`}>
        <i className="ph ph-caret-right" />
      </button>
    );
  }
  function SamplePrevArrow(props) {
    const { className, onClick } = props;
    return (
      <button type="button" onClick={onClick}
        className={`${className} slick-prev slick-arrow flex-center rounded-circle bg-white text-xl hover-bg-main-600 hover-text-white transition-1`}>
        <i className="ph ph-caret-left" />
      </button>
    );
  }

  const settings = {
    dots: true, arrows: true, infinite: true,
    speed: 1500, slidesToShow: 1, slidesToScroll: 1,
    autoplay: true, autoplaySpeed: 4000,
    nextArrow: <SampleNextArrow />, prevArrow: <SamplePrevArrow />,
  };

  return (
    <div className="banner">
      <div className="container container-lg">
        <div className="banner-item rounded-24 overflow-hidden position-relative arrow-center">
          <a href="#featureSection"
            className="scroll-down w-84 h-84 text-center flex-center bg-main-600 rounded-circle border border-5 text-white border-white position-absolute start-50 translate-middle-x bottom-0 hover-bg-main-800"
            style={{ zIndex: 10 }}>
            <span className="icon line-height-0">
              <i className="ph ph-caret-double-down" />
            </span>
          </a>

          <div className="banner-slider">
            <Slider {...settings}>
              {slides.map((slide, i) => (
                <div key={i} className="banner-slider__item">
                  <div
                    className="banner-slider__inner flex-between position-relative"
                    style={{ background: slide.bg, minHeight: 320, padding: "40px 32px" }}
                  >
                    <div className="banner-item__content" style={{ maxWidth: 480, zIndex: 2 }}>
                      <h1 className="banner-item__title" style={{ fontSize: "clamp(1.4rem,3vw,2.2rem)" }}>
                        {slide.title}
                      </h1>
                      <p className="text-gray-600 mb-24 d-none d-md-block">{slide.subtitle}</p>
                      <Link to="/shop"
                        className="btn btn-main d-inline-flex align-items-center rounded-pill gap-8">
                        Explore Shop{" "}
                        <span className="icon text-xl d-flex">
                          <i className="ph ph-shopping-cart-simple" />
                        </span>
                      </Link>
                    </div>
                    <div className="banner-item__thumb d-md-block d-none">
                      <img
                        src={slide.img}
                        alt={slide.title}
                        style={{
                          maxHeight: 280, maxWidth: 420,
                          objectFit: "cover", borderRadius: 16,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.15)"
                        }}
                        onError={(e) => { e.target.src = "https://placehold.co/420x280/f1f5f9/94a3b8?text=Banner"; }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BannerOne;
