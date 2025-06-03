import React from 'react';
import ConfettiCannon from 'react-native-confetti-cannon';

const Celebration = ({ show }: { show: boolean }) => {
  if (!show) return null;
  return (
    <ConfettiCannon
      count={200}
      origin={{x: -10, y: 0}}
      fadeOut
      autoStart
    />
  );
};

export default Celebration;
