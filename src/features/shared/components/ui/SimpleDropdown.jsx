// src/features/shared/components/ui/SimpleDropdown.jsx
import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

export const SimpleDropdown = ({ children, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-800 border border-white/10 shadow-lg z-50">
          <div className="py-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

SimpleDropdown.propTypes = {
  children: PropTypes.node.isRequired,
  trigger: PropTypes.node.isRequired,
};

export const SimpleDropdownItem = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition-colors flex items-center ${className}`}
    >
      {children}
    </button>
  );
};

SimpleDropdownItem.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  className: PropTypes.string,
};