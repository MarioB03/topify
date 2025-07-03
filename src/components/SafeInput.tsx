import React, { InputHTMLAttributes } from 'react';
import { sanitizeString } from '../utils/validation';

interface SafeInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onSafeChange?: (value: string) => void;
  maxLength?: number;
}

const SafeInput: React.FC<SafeInputProps> = ({ 
  onSafeChange, 
  onChange,
  maxLength = 100,
  ...props 
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Limitar longitud
    if (rawValue.length > maxLength) {
      e.target.value = rawValue.slice(0, maxLength);
      return;
    }
    
    // Sanitizar en tiempo real para prevenir caracteres peligrosos
    const sanitized = sanitizeString(rawValue);
    
    // Si el valor cambió después de sanitizar, actualizar el input
    if (sanitized !== rawValue) {
      e.target.value = sanitized;
    }
    
    // Llamar callback con valor sanitizado
    if (onSafeChange) {
      onSafeChange(sanitized);
    }
    
    // Llamar onChange original si existe
    if (onChange) {
      onChange(e);
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const sanitized = sanitizeString(pastedText);
    
    // Insertar texto sanitizado
    const input = e.currentTarget;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    
    const newValue = 
      input.value.substring(0, start) + 
      sanitized + 
      input.value.substring(end);
    
    // Respetar límite de longitud
    input.value = newValue.slice(0, maxLength);
    
    // Mover cursor al final del texto pegado
    const newCursorPos = start + sanitized.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
    
    // Disparar evento de cambio
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  
  return (
    <input
      {...props}
      onChange={handleChange}
      onPaste={handlePaste}
      maxLength={maxLength}
    />
  );
};

export default SafeInput;