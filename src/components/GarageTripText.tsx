import clsx from 'clsx';


interface IProps {
  className?: string;
  suffixes?: string[];
  colorMask?: boolean[];
}

const GarageTripText: React.FC<IProps> = ({
  suffixes = [],
  colorMask = [],
  className,
}) => {

  return (
    <span className={clsx('monospace', className)}>
      garage::<span className="secondary-color">trip</span>
      {suffixes.map((chunk, index) => {
        if (colorMask[index]) {
          return (
            <>
              ::<span className="secondary-color">{chunk}</span>
            </>
          );
        }
        return `::${chunk}`;
      })}
    </span>
  );
};

export default GarageTripText;
