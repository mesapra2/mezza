import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '@/utils';

/**
 * Container responsivo reutilizável para manter consistência
 * no layout em diferentes breakpoints
 */
const ResponsiveContainer = ({ 
  children, 
  size = 'default', 
  className = '',
  as: Component = 'div',
  ...props 
}) => {
  const sizeClasses = {
    'full': 'w-full',
    'small': 'max-w-2xl px-4 mx-auto',
    'medium': 'max-w-4xl px-4 sm:px-6 mx-auto',
    'default': 'max-w-7xl px-4 sm:px-6 lg:px-8 mx-auto',
    'wide': 'max-w-[1400px] px-4 sm:px-6 lg:px-8 xl:px-12 mx-auto'
  };

  return (
    <Component 
      className={cn(
        'w-full',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

ResponsiveContainer.propTypes = {
  children: PropTypes.node.isRequired,
  size: PropTypes.oneOf(['full', 'small', 'medium', 'default', 'wide']),
  className: PropTypes.string,
  as: PropTypes.elementType,
};

export default ResponsiveContainer;