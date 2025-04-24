import React from 'react';

interface SkeletonProps {
  count?: number;
  width?: string | number;
  height?: string | number;
  className?: string;
  circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  count = 1,
  width = '100%',
  height = 20,
  className = '',
  circle = false,
}) => {
  const skeletons = Array(count).fill(0);

  return (
    <>
      {skeletons.map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${className} ${
            circle ? 'rounded-full' : 'rounded'
          }`}
          style={{
            width,
            height,
            marginBottom: index < skeletons.length - 1 ? '0.5rem' : 0,
          }}
        />
      ))}
    </>
  );
};

export default Skeleton; 