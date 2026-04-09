import Autoplay from 'embla-carousel-autoplay';
import useEmblaCarousel from 'embla-carousel-react';

const Carousel = ({ slides, renderSlide }) => {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [
    Autoplay({ stopOnInteraction: false, stopOnMouseEnter: true }),
  ]);

  return (
    <div className="relative w-full">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, index) => (
            <div key={index} className="min-w-0 flex-[0_0_100%] px-2">
              {renderSlide(slide, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Carousel;
