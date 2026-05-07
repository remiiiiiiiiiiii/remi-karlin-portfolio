type Props = {
  images: string[];
  alt?: string;
  columns?: number;
};

export default function PhotoGallery({ images, alt = "Photo", columns = 4 }: Props) {
  return (
    <div
      style={{
        columns,
        columnGap: 8,
      }}
    >
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={`${alt} ${i + 1}`}
          loading="lazy"
          style={{
            width: "100%",
            display: "block",
            marginBottom: 8,
            breakInside: "avoid",
          }}
        />
      ))}
    </div>
  );
}
