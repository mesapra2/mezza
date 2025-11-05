import React, { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ✅ Importa as imagens corretamente (ajuste o caminho se necessário)
import b1 from "@/assets/banners/b1.png";
import b2 from "@/assets/banners/b2.png";
import b3 from "@/assets/banners/b3.png";
import b4 from "@/assets/banners/b4.png";

const images = [b1, b2, b3, b4];

const BannerCarousel = ({ interval }) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isPaused) return;

    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, interval);

    return () => clearInterval(timerRef.current);
  }, [isPaused, interval]);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (i) => {
    setIndex(i % images.length);
  };

  const prev = () => {
    setIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  };

  const next = () => {
    setIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  return (
    <div
      className="relative w-full h-56 md:h-72 lg:h-80 overflow-hidden rounded-2xl border border-white/10 shadow-lg bg-gray-800"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.img
          key={images[index]}
          src={images[index]}
          alt={`Banner ${index + 1}`}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      </AnimatePresence>

      {/* Overlay sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30 pointer-events-none" />

      {/* Botões de navegação */}
      <button
        type="button"
        aria-label="Anterior"
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      <button
        type="button"
        aria-label="Próximo"
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>

      {/* Indicadores de posição */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para banner ${i + 1}`}
            onClick={() => goTo(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === index ? "bg-white scale-110" : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// ✅ Validação ESLint (PropTypes)
BannerCarousel.propTypes = {
  interval: PropTypes.number,
};

// ✅ Valor padrão para prop interval
BannerCarousel.defaultProps = {
  interval: 5000,
};

export default BannerCarousel;
