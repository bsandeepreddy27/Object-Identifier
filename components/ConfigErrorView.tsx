import React from 'react';
import { IconWarning } from '../icons/IconWarning';

interface ConfigErrorViewProps {
  message: string;
}

/**
 * A modal-like overlay that displays critical configuration errors to the user,
 * preventing them from interacting with the app until the issue is resolved.
 */
export const ConfigErrorView: React.FC<ConfigErrorViewProps> = ({ message }) => {
  return (
    <div className="absolute inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50 animate-fade-in p-4">
      <div className="bg-gray-800 border border-red-500/50 rounded-2xl shadow-2xl p-8 max-w-lg text-center">
        <IconWarning className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-3">Configuration Required</h2>
        <p className="text-gray-300 mb-6 whitespace-pre-wrap">{message}</p>
      </div>
    </div>
  );
};