/**
 * Affiche le logo d'un vendeur : image URL ou emoji
 * Props: src, size (px), className, style
 */
const SellerLogo = ({ src, size = 40, className = '', style = {} }) => {
  const isUrl = src && (src.startsWith('/') || src.startsWith('http'));
  if (isUrl) {
    return (
      <img
        src={src} alt="logo"
        style={{ width: size, height: size, objectFit: 'cover', ...style }}
        className={`rounded-full ${className}`}
        onError={e => { e.target.style.display='none'; }}
      />
    );
  }
  return (
    <span style={{ fontSize: size * 0.6, lineHeight: 1, ...style }} className={className}>
      {src || '🏪'}
    </span>
  );
};

export default SellerLogo;
