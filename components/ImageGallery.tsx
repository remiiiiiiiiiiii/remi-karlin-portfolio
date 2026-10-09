type Props = {
  images: { path: string; width?: number; height?: number }[];
  alt?: string;
};

/**
 * Masonry gallery (CSS columns, see .img-gallery). Server component: plain lazy images with
 * width/height attributes so the layout does not jump while they load. The first image of the
 * page is not special-cased: galleries sit below the fold.
 */
export default function ImageGallery({ images, alt = "Visual" }: Props) {
  return (
    <div className="img-gallery">
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={img.path}
          src={img.path}
          alt={`${alt} ${i + 1}`}
          width={img.width}
          height={img.height}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  );
}
