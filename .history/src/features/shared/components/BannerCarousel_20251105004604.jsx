// src/features/shared/components/BannerCarousel.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const images = [
  "/src/assets/banners/b1.png",
  "/src/assets/banners/b2.png",
  "/src/assets/banners/b3.png",
  "/src/assets/banners/b4.png",
];

const BannerCarousel = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 5000); // muda a cada 5s
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-56 md:h-72 lg:h-80 overflow-hidden rounded-2xl border border-white/10 shadow-lg">
      <AnimatePresence>
        <motion.img
          key={images[index]}
          src={images[index]}
          alt="Banner promocional"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Indicadores de posição */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full transition-all ${
              i === index ? "bg-white" : "bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default BannerCarousel;
