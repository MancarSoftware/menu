type LocationMapProps = {
  latitude: number;
  longitude: number;
  label: string;
};

export function LocationMap({ latitude, longitude, label }: LocationMapProps) {
  const longitudeDelta = 0.018;
  const latitudeDelta = 0.011;
  const boundingBox = [
    longitude - longitudeDelta,
    latitude - latitudeDelta,
    longitude + longitudeDelta,
    latitude + latitudeDelta,
  ].join(",");
  const source = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(boundingBox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;

  return (
    <iframe
      className="location-map__frame"
      src={source}
      title={`Mapa de ${label}`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
