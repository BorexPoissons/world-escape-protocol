interface FlagImageProps {
  code: string;
  size?: number;
  className?: string;
}

const FlagImage = ({ code, size = 48, className = "" }: FlagImageProps) => {
  const lower = code.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w${size}/${lower}.png`}
      srcSet={`https://flagcdn.com/w${size * 2}/${lower}.png 2x`}
      alt={code}
      width={size}
      height={size * 0.67}
      className={`object-cover rounded-sm ${className}`}
      onError={(e) => {
        // Fallback to emoji if image fails
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
};

export default FlagImage;
