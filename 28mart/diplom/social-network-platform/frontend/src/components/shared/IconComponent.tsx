import React from 'react';
import { IconType } from 'react-icons';
import { IconBaseProps } from 'react-icons/lib';

interface IconProps extends IconBaseProps {
  icon: IconType;
}

const IconComponent = ({ icon: Icon, ...props }: IconProps) => {
  return <Icon {...props} />;
};

export default IconComponent;
